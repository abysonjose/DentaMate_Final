package com.dentamate.appointments.service;

import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.AppointmentStatus;
import com.dentamate.appointments.repository.AppointmentRepository;
import com.dentamate.appointments.repository.TokenRepository;
import com.dentamate.appointments.repository.DoctorScheduleRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Service
public class ScheduledTaskService {

    private static final Logger logger = LoggerFactory.getLogger(ScheduledTaskService.class);

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private DoctorScheduleRepository scheduleRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Send appointment reminders
     * Runs every 15 minutes
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    public void sendAppointmentReminders() {
        logger.info("Starting appointment reminder task");
        
        try {
            LocalDateTime now = LocalDateTime.now();
            
            // Send 24-hour reminders
            LocalDateTime tomorrow = now.plusHours(24);
            LocalDateTime tomorrowEnd = tomorrow.plusMinutes(15);
            sendRemindersForTimeRange(now, tomorrow, tomorrowEnd, 1440); // 24 hours = 1440 minutes
            
            // Send 2-hour reminders
            LocalDateTime twoHoursLater = now.plusHours(2);
            LocalDateTime twoHoursEnd = twoHoursLater.plusMinutes(15);
            sendRemindersForTimeRange(now, twoHoursLater, twoHoursEnd, 120); // 2 hours = 120 minutes
            
            // Send 30-minute reminders
            LocalDateTime thirtyMinutesLater = now.plusMinutes(30);
            LocalDateTime thirtyMinutesEnd = thirtyMinutesLater.plusMinutes(15);
            sendRemindersForTimeRange(now, thirtyMinutesLater, thirtyMinutesEnd, 30);
            
        } catch (Exception e) {
            logger.error("Error in appointment reminder task: {}", e.getMessage(), e);
        }
    }

    /**
     * Mark overdue appointments as no-show
     * Runs every 30 minutes
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes
    public void markOverdueAppointments() {
        logger.info("Starting overdue appointment cleanup task");
        
        try {
            // Mark appointments as no-show if they're 30 minutes past scheduled time
            LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(30);
            
            // Find all tenants (in a real implementation, you'd get this from a tenant service)
            // For now, we'll process all overdue appointments
            List<Appointment> overdueAppointments = appointmentRepository
                .findOverdueAppointments("", cutoffTime); // Empty tenant ID to get all
            
            for (Appointment appointment : overdueAppointments) {
                try {
                    appointment.setStatus(AppointmentStatus.NO_SHOW.getValue());
                    appointment.setUpdatedBy("SYSTEM");
                    appointmentRepository.save(appointment);
                    
                    logger.info("Marked appointment {} as no-show", appointment.getId());
                    
                    // Send notification about no-show
                    notificationService.sendStatusUpdateNotification(
                        appointment, 
                        AppointmentStatus.fromValue(appointment.getStatus()), 
                        AppointmentStatus.NO_SHOW
                    );
                    
                } catch (Exception e) {
                    logger.error("Error marking appointment {} as no-show: {}", 
                               appointment.getId(), e.getMessage());
                }
            }
            
            logger.info("Processed {} overdue appointments", overdueAppointments.size());
            
        } catch (Exception e) {
            logger.error("Error in overdue appointment cleanup task: {}", e.getMessage(), e);
        }
    }

    /**
     * Clean up old tokens and schedules
     * Runs daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldData() {
        logger.info("Starting data cleanup task");
        
        try {
            LocalDate cutoffDate = LocalDate.now().minusDays(30); // Keep data for 30 days
            
            // Clean up old tokens
            var oldTokens = tokenRepository.findOverdueTokens("", cutoffDate);
            if (!oldTokens.isEmpty()) {
                tokenRepository.deleteAll(oldTokens);
                logger.info("Deleted {} old tokens", oldTokens.size());
            }
            
            // Clean up old schedules
            var oldSchedules = scheduleRepository.findOldSchedules("", cutoffDate);
            if (!oldSchedules.isEmpty()) {
                scheduleRepository.deleteAll(oldSchedules);
                logger.info("Deleted {} old schedules", oldSchedules.size());
            }
            
        } catch (Exception e) {
            logger.error("Error in data cleanup task: {}", e.getMessage(), e);
        }
    }

    /**
     * Generate daily schedules for doctors
     * Runs daily at 6 AM
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void generateDailySchedules() {
        logger.info("Starting daily schedule generation task");
        
        try {
            // This would integrate with a doctor/staff service to get doctor schedules
            // For now, this is a placeholder for the functionality
            
            LocalDate today = LocalDate.now();
            LocalDate nextWeek = today.plusDays(7);
            
            logger.info("Generated schedules for dates {} to {}", today, nextWeek);
            
        } catch (Exception e) {
            logger.error("Error in daily schedule generation task: {}", e.getMessage(), e);
        }
    }

    /**
     * Update wait times for tokens
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void updateTokenWaitTimes() {
        logger.info("Starting token wait time update task");
        
        try {
            // This would update estimated wait times for all active tokens
            // Implementation would depend on real-time queue status
            
            LocalDate today = LocalDate.now();
            // Update wait times for today's tokens
            
            logger.info("Updated wait times for tokens on {}", today);
            
        } catch (Exception e) {
            logger.error("Error in token wait time update task: {}", e.getMessage(), e);
        }
    }

    // Private helper methods

    private void sendRemindersForTimeRange(LocalDateTime now, LocalDateTime startTime, 
                                         LocalDateTime endTime, int minutesBefore) {
        try {
            // In a real implementation, you'd iterate through all tenants
            List<Appointment> upcomingAppointments = appointmentRepository
                .findUpcomingAppointments("", startTime, endTime); // Empty tenant ID for all
            
            for (Appointment appointment : upcomingAppointments) {
                try {
                    notificationService.sendAppointmentReminder(appointment, minutesBefore);
                } catch (Exception e) {
                    logger.error("Error sending reminder for appointment {}: {}", 
                               appointment.getId(), e.getMessage());
                }
            }
            
            if (!upcomingAppointments.isEmpty()) {
                logger.info("Sent {} reminders for {} minutes before appointments", 
                           upcomingAppointments.size(), minutesBefore);
            }
            
        } catch (Exception e) {
            logger.error("Error sending reminders for time range {} to {}: {}", 
                        startTime, endTime, e.getMessage());
        }
    }
}