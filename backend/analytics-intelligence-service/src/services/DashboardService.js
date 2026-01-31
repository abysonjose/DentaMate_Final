const DashboardConfig = require('../models/DashboardConfig');
const KPIService = require('./KPIService');
const logger = require('../utils/logger');

class DashboardService {
  constructor() {
    this.kpiService = new KPIService();
    this.widgetRenderers = new Map();
    this.initializeWidgetRenderers();
  }

  initializeWidgetRenderers() {
    this.widgetRenderers.set('KPI', this.renderKPIWidget.bind(this));
    this.widgetRenderers.set('CHART', this.renderChartWidget.bind(this));
    this.widgetRenderers.set('TABLE', this.renderTableWidget.bind(this));
    this.widgetRenderers.set('GAUGE', this.renderGaugeWidget.bind(this));
    this.widgetRenderers.set('MAP', this.renderMapWidget.bind(this));
  }

  async getDashboard(tenantId, role, options = {}) {
    try {
      const {
        dashboardType = 'OPERATIONAL',
        branchId,
        refresh = false,
        customFilters = {}
      } = options;

      logger.info('Fetching dashboard', {
        tenantId,
        role,
        dashboardType,
        branchId,
        refresh,
        category: 'dashboard'
      });

      // Get dashboard configuration
      let dashboardConfig = await this.getDashboardConfig(tenantId, role, dashboardType);
      
      if (!dashboardConfig) {
        // Create default dashboard if none exists
        dashboardConfig = await this.createDefaultDashboard(tenantId, role, dashboardType);
      }

      // Render dashboard widgets
      const renderedWidgets = await this.renderWidgets(
        dashboardConfig.widgets,
        tenantId,
        { role, branchId, refresh, customFilters }
      );

      // Update usage statistics
      await dashboardConfig.incrementViewCount();

      const dashboard = {
        id: dashboardConfig._id,
        name: dashboardConfig.name,
        description: dashboardConfig.description,
        layout: dashboardConfig.layout,
        widgets: renderedWidgets,
        filters: dashboardConfig.filters,
        settings: dashboardConfig.settings,
        metadata: {
          ...dashboardConfig.metadata,
          generatedAt: new Date(),
          dataFreshness: this.getDataFreshness(renderedWidgets)
        }
      };

      return {
        success: true,
        data: dashboard
      };

    } catch (error) {
      logger.error('Error fetching dashboard', {
        error: error.message,
        tenantId,
        role,
        options,
        category: 'dashboard'
      });
      throw error;
    }
  }

  async getDashboardConfig(tenantId, role, dashboardType) {
    try {
      // First try to get user's default dashboard
      let config = await DashboardConfig.getDefaultDashboard(tenantId, role, dashboardType);
      
      if (!config) {
        // Try to get any dashboard for this role and type
        const configs = await DashboardConfig.findByTenantAndRole(tenantId, role, { 
          dashboardType, 
          limit: 1 
        });
        config = configs.length > 0 ? configs[0] : null;
      }

      if (!config) {
        // Try to get system default dashboard
        const systemConfigs = await DashboardConfig.getSystemDashboards(role, dashboardType);
        config = systemConfigs.length > 0 ? systemConfigs[0] : null;
      }

      return config;

    } catch (error) {
      logger.error('Error fetching dashboard config', {
        error: error.message,
        tenantId,
        role,
        dashboardType,
        category: 'dashboard'
      });
      return null;
    }
  }

  async createDefaultDashboard(tenantId, role, dashboardType) {
    try {
      logger.info('Creating default dashboard', {
        tenantId,
        role,
        dashboardType,
        category: 'dashboard'
      });

      const defaultConfig = this.getDefaultDashboardConfig(role, dashboardType);
      
      const dashboardConfig = new DashboardConfig({
        tenantId,
        role,
        dashboardType,
        ...defaultConfig,
        isDefault: true,
        metadata: {
          createdBy: {
            userId: 'system',
            name: 'System',
            role: 'SYSTEM'
          },
          version: 1,
          usage: {
            viewCount: 0,
            errorCount: 0
          }
        }
      });

      await dashboardConfig.save();
      return dashboardConfig;

    } catch (error) {
      logger.error('Error creating default dashboard', {
        error: error.message,
        tenantId,
        role,
        dashboardType,
        category: 'dashboard'
      });
      throw error;
    }
  }

  async renderWidgets(widgets, tenantId, options) {
    const renderedWidgets = [];

    for (const widget of widgets) {
      if (!widget.isVisible) continue;

      try {
        const renderer = this.widgetRenderers.get(widget.type);
        if (!renderer) {
          logger.warn('Unknown widget type', {
            widgetType: widget.type,
            widgetId: widget.id,
            category: 'dashboard'
          });
          continue;
        }

        const renderedWidget = await renderer(widget, tenantId, options);
        renderedWidgets.push(renderedWidget);

      } catch (error) {
        logger.error('Error rendering widget', {
          error: error.message,
          widgetId: widget.id,
          widgetType: widget.type,
          tenantId,
          category: 'dashboard'
        });

        // Add error widget
        renderedWidgets.push({
          ...widget,
          data: null,
          error: {
            message: 'Widget failed to load',
            code: 'RENDER_ERROR'
          },
          renderedAt: new Date()
        });
      }
    }

    return renderedWidgets.sort((a, b) => a.order - b.order);
  }

  async renderKPIWidget(widget, tenantId, options) {
    const { role, branchId, refresh } = options;
    const { metric, trend } = widget.config;

    let kpiData = null;
    let trendData = null;

    if (metric) {
      // Get KPI value
      kpiData = await this.kpiService.getKPI(tenantId, metric, { branchId, refresh });

      // Get trend data if enabled
      if (trend && trend.enabled) {
        const trendResult = await this.kpiService.getTrendData(tenantId, metric, {
          branchId,
          days: this.parseTrendPeriod(trend.period)
        });
        trendData = trendResult.trend;
      }
    }

    return {
      ...widget,
      data: {
        value: kpiData?.value,
        unit: kpiData?.unit,
        formattedValue: this.formatKPIValue(kpiData?.value, kpiData?.unit),
        trend: trendData,
        threshold: this.evaluateThreshold(kpiData?.value, widget.config.threshold),
        metadata: kpiData?.metadata
      },
      renderedAt: new Date()
    };
  }

  async renderChartWidget(widget, tenantId, options) {
    const { role, branchId, refresh } = options;
    const { chartType, dataSource, query, xAxis, yAxis, groupBy, aggregation } = widget.config;

    let chartData = null;

    if (dataSource === 'METRICS' && query?.metrics) {
      // Get metrics data for chart
      const metricsData = await this.getMetricsForChart(
        tenantId,
        query.metrics,
        { branchId, groupBy, aggregation }
      );
      
      chartData = this.formatChartData(metricsData, chartType, xAxis, yAxis);
    }

    return {
      ...widget,
      data: {
        chartType,
        data: chartData,
        config: {
          xAxis,
          yAxis,
          groupBy,
          aggregation
        }
      },
      renderedAt: new Date()
    };
  }

  async renderTableWidget(widget, tenantId, options) {
    const { role, branchId, refresh } = options;
    const { columns, pagination, query } = widget.config;

    let tableData = null;

    if (query) {
      tableData = await this.getTableData(tenantId, query, { branchId, pagination });
    }

    return {
      ...widget,
      data: {
        columns,
        rows: tableData?.rows || [],
        pagination: {
          ...pagination,
          total: tableData?.total || 0,
          pages: Math.ceil((tableData?.total || 0) / (pagination?.pageSize || 10))
        }
      },
      renderedAt: new Date()
    };
  }

  async renderGaugeWidget(widget, tenantId, options) {
    const { role, branchId, refresh } = options;
    const { metric, minValue, maxValue, ranges } = widget.config;

    let gaugeData = null;

    if (metric) {
      const kpiData = await this.kpiService.getKPI(tenantId, metric, { branchId, refresh });
      
      gaugeData = {
        value: kpiData?.value || 0,
        minValue: minValue || 0,
        maxValue: maxValue || 100,
        ranges: ranges || [],
        percentage: this.calculateGaugePercentage(kpiData?.value, minValue, maxValue)
      };
    }

    return {
      ...widget,
      data: gaugeData,
      renderedAt: new Date()
    };
  }

  async renderMapWidget(widget, tenantId, options) {
    const { role, branchId } = options;
    
    // Map widget implementation would depend on specific requirements
    // For now, return placeholder
    return {
      ...widget,
      data: {
        type: 'map',
        message: 'Map widget not implemented yet'
      },
      renderedAt: new Date()
    };
  }

  async getMetricsForChart(tenantId, metrics, options) {
    const { branchId, groupBy = 'day', aggregation = 'SUM' } = options;

    try {
      const metricsData = await this.kpiService.constructor.prototype.constructor
        .getAggregatedMetrics(tenantId, metrics, groupBy, branchId);

      return metricsData;

    } catch (error) {
      logger.error('Error fetching metrics for chart', {
        error: error.message,
        tenantId,
        metrics,
        options,
        category: 'dashboard'
      });
      return [];
    }
  }

  async getTableData(tenantId, query, options) {
    const { branchId, pagination } = options;

    // This would implement actual table data fetching based on query
    // For now, return mock data
    return {
      rows: [
        { id: 1, name: 'Sample Row 1', value: 100 },
        { id: 2, name: 'Sample Row 2', value: 200 }
      ],
      total: 2
    };
  }

  getDefaultDashboardConfig(role, dashboardType) {
    const configs = {
      'SAAS_ADMIN': {
        'OPERATIONAL': {
          name: 'SaaS Admin Operations Dashboard',
          description: 'Platform-wide operational metrics',
          layout: { columns: 12, rows: 6 },
          widgets: [
            {
              id: 'revenue-kpi',
              type: 'KPI',
              title: 'Daily Revenue',
              position: { x: 0, y: 0, width: 3, height: 2 },
              config: {
                metric: 'DAILY_REVENUE',
                unit: 'CURRENCY',
                trend: { enabled: true, period: '7D' }
              },
              order: 1
            },
            {
              id: 'patients-kpi',
              type: 'KPI',
              title: 'Patient Footfall',
              position: { x: 3, y: 0, width: 3, height: 2 },
              config: {
                metric: 'PATIENT_FOOTFALL',
                unit: 'COUNT',
                trend: { enabled: true, period: '7D' }
              },
              order: 2
            },
            {
              id: 'completion-rate',
              type: 'KPI',
              title: 'Completion Rate',
              position: { x: 6, y: 0, width: 3, height: 2 },
              config: {
                metric: 'APPOINTMENT_COMPLETION_RATE',
                unit: 'PERCENTAGE',
                threshold: { warning: 85, critical: 75 }
              },
              order: 3
            },
            {
              id: 'staff-utilization',
              type: 'GAUGE',
              title: 'Staff Utilization',
              position: { x: 9, y: 0, width: 3, height: 2 },
              config: {
                metric: 'STAFF_UTILIZATION',
                minValue: 0,
                maxValue: 100,
                ranges: [
                  { min: 0, max: 60, color: '#ff4444', label: 'Low' },
                  { min: 60, max: 80, color: '#ffaa00', label: 'Medium' },
                  { min: 80, max: 100, color: '#00aa00', label: 'High' }
                ]
              },
              order: 4
            }
          ]
        }
      },
      'CENTRAL_ADMIN': {
        'OPERATIONAL': {
          name: 'Central Admin Dashboard',
          description: 'Clinic-wide operational overview',
          layout: { columns: 12, rows: 8 },
          widgets: [
            {
              id: 'revenue-kpi',
              type: 'KPI',
              title: 'Daily Revenue',
              position: { x: 0, y: 0, width: 2, height: 2 },
              config: {
                metric: 'DAILY_REVENUE',
                unit: 'CURRENCY',
                trend: { enabled: true, period: '30D' }
              },
              order: 1
            },
            {
              id: 'patients-kpi',
              type: 'KPI',
              title: 'Patient Footfall',
              position: { x: 2, y: 0, width: 2, height: 2 },
              config: {
                metric: 'PATIENT_FOOTFALL',
                unit: 'COUNT',
                trend: { enabled: true, period: '30D' }
              },
              order: 2
            },
            {
              id: 'wait-time-kpi',
              type: 'KPI',
              title: 'Avg Wait Time',
              position: { x: 4, y: 0, width: 2, height: 2 },
              config: {
                metric: 'AVERAGE_WAIT_TIME',
                unit: 'TIME_MINUTES',
                threshold: { warning: 20, critical: 30 }
              },
              order: 3
            },
            {
              id: 'revenue-chart',
              type: 'CHART',
              title: 'Revenue Trend',
              position: { x: 0, y: 2, width: 6, height: 3 },
              config: {
                chartType: 'LINE',
                dataSource: 'METRICS',
                query: { metrics: ['DAILY_REVENUE'] },
                xAxis: 'period',
                yAxis: 'value',
                groupBy: 'day'
              },
              order: 4
            }
          ]
        }
      },
      'BRANCH_ADMIN': {
        'OPERATIONAL': {
          name: 'Branch Operations Dashboard',
          description: 'Branch-specific operational metrics',
          layout: { columns: 12, rows: 6 },
          widgets: [
            {
              id: 'daily-patients',
              type: 'KPI',
              title: 'Today\'s Patients',
              position: { x: 0, y: 0, width: 3, height: 2 },
              config: {
                metric: 'PATIENT_FOOTFALL',
                unit: 'COUNT'
              },
              order: 1
            },
            {
              id: 'queue-efficiency',
              type: 'KPI',
              title: 'Queue Efficiency',
              position: { x: 3, y: 0, width: 3, height: 2 },
              config: {
                metric: 'QUEUE_EFFICIENCY',
                unit: 'PERCENTAGE',
                threshold: { warning: 80, critical: 70 }
              },
              order: 2
            },
            {
              id: 'staff-utilization-gauge',
              type: 'GAUGE',
              title: 'Staff Utilization',
              position: { x: 6, y: 0, width: 3, height: 2 },
              config: {
                metric: 'STAFF_UTILIZATION',
                minValue: 0,
                maxValue: 100
              },
              order: 3
            }
          ]
        }
      },
      'ACCOUNTS_MANAGER': {
        'FINANCIAL': {
          name: 'Financial Dashboard',
          description: 'Financial metrics and billing overview',
          layout: { columns: 12, rows: 6 },
          widgets: [
            {
              id: 'daily-revenue',
              type: 'KPI',
              title: 'Daily Revenue',
              position: { x: 0, y: 0, width: 3, height: 2 },
              config: {
                metric: 'DAILY_REVENUE',
                unit: 'CURRENCY',
                trend: { enabled: true, period: '30D' }
              },
              order: 1
            },
            {
              id: 'collection-rate',
              type: 'KPI',
              title: 'Collection Rate',
              position: { x: 3, y: 0, width: 3, height: 2 },
              config: {
                metric: 'BILLING_COLLECTION_RATE',
                unit: 'PERCENTAGE',
                threshold: { warning: 85, critical: 75 }
              },
              order: 2
            },
            {
              id: 'outstanding-payments',
              type: 'KPI',
              title: 'Outstanding',
              position: { x: 6, y: 0, width: 3, height: 2 },
              config: {
                metric: 'OUTSTANDING_PAYMENTS',
                unit: 'CURRENCY'
              },
              order: 3
            }
          ]
        }
      },
      'DOCTOR': {
        'CLINICAL': {
          name: 'Doctor Dashboard',
          description: 'Personal performance metrics',
          layout: { columns: 12, rows: 4 },
          widgets: [
            {
              id: 'appointments-today',
              type: 'KPI',
              title: 'Today\'s Appointments',
              position: { x: 0, y: 0, width: 4, height: 2 },
              config: {
                metric: 'APPOINTMENT_COUNT',
                unit: 'COUNT'
              },
              order: 1
            },
            {
              id: 'completion-rate',
              type: 'KPI',
              title: 'Completion Rate',
              position: { x: 4, y: 0, width: 4, height: 2 },
              config: {
                metric: 'APPOINTMENT_COMPLETION_RATE',
                unit: 'PERCENTAGE'
              },
              order: 2
            },
            {
              id: 'patient-satisfaction',
              type: 'KPI',
              title: 'Patient Satisfaction',
              position: { x: 8, y: 0, width: 4, height: 2 },
              config: {
                metric: 'PATIENT_SATISFACTION',
                unit: 'RATIO'
              },
              order: 3
            }
          ]
        }
      }
    };

    return configs[role]?.[dashboardType] || {
      name: 'Default Dashboard',
      description: 'Basic dashboard',
      layout: { columns: 12, rows: 4 },
      widgets: []
    };
  }

  formatKPIValue(value, unit) {
    if (value === null || value === undefined) return 'N/A';

    switch (unit) {
      case 'CURRENCY':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'PERCENTAGE':
        return `${value.toFixed(1)}%`;
      case 'TIME_MINUTES':
        return `${value} min`;
      case 'TIME_HOURS':
        return `${value} hrs`;
      case 'RATIO':
        return value.toFixed(2);
      default:
        return typeof value === 'number' ? value.toLocaleString() : value;
    }
  }

  evaluateThreshold(value, threshold) {
    if (!threshold || value === null || value === undefined) return null;

    if (threshold.critical !== undefined && value <= threshold.critical) {
      return { level: 'CRITICAL', color: '#ff4444' };
    }
    if (threshold.warning !== undefined && value <= threshold.warning) {
      return { level: 'WARNING', color: '#ffaa00' };
    }
    return { level: 'NORMAL', color: '#00aa00' };
  }

  parseTrendPeriod(period) {
    const periodMap = {
      '1H': 1,
      '24H': 1,
      '7D': 7,
      '30D': 30
    };
    return periodMap[period] || 7;
  }

  formatChartData(metricsData, chartType, xAxis, yAxis) {
    if (!metricsData || metricsData.length === 0) return null;

    // Transform aggregated metrics data into chart format
    return metricsData.map(item => ({
      x: item._id.day || item._id.month || item._id.year,
      y: item.totalValue || item.avgValue,
      metric: item._id.metric
    }));
  }

  calculateGaugePercentage(value, minValue = 0, maxValue = 100) {
    if (value === null || value === undefined) return 0;
    return Math.min(Math.max(((value - minValue) / (maxValue - minValue)) * 100, 0), 100);
  }

  getDataFreshness(widgets) {
    let oldestFreshness = new Date();
    
    widgets.forEach(widget => {
      if (widget.data?.metadata?.dataFreshness) {
        const freshness = new Date(widget.data.metadata.dataFreshness);
        if (freshness < oldestFreshness) {
          oldestFreshness = freshness;
        }
      }
    });

    return oldestFreshness;
  }
}

module.exports = DashboardService;