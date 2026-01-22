package com.dentamate.appointments.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AppointmentResponse {
    
    private String id;
    private String tenantId;
    private String patientId;
    private String doctorId;
    private String clinicId;
    private String branchId;
    private String departmentId;
    private String roomId;
    
    private LocalDateTime appointmentDateTime;
    private Integer durationMinutes;
    private String appointmentType;
    private String status;
    private String priority;
    private String reason;
    private String notes;
    
    // Token information
    private TokenInfo token;
    
    // Recurring appointment info
    private Boolean isRecurring;
    private String recurrencePattern;
    private Integer recurrenceInterval;
    private LocalDateTime recurrenceEndDate;
    private String parentAppointmentId;
    
    // Reminder settings
    private List<ReminderSettingDto> reminders;
    
    // Payment info
    private Double estimatedCost;
    private String paymentStatus;
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // Constructors
    public AppointmentResponse() {}

    // Inner classes
    public static class TokenInfo {
        private String tokenId;
        private Integer tokenNumber;
        private String tokenStatus;
        private Integer estimatedWaitTime;
        private LocalDateTime checkedInAt;

        public TokenInfo() {}

        public TokenInfo(String tokenId, Integer tokenNumber, String tokenStatus, 
                        Integer estimatedWaitTime, LocalDateTime checkedInAt) {
            this.tokenId = tokenId;
            this.tokenNumber = tokenNumber;
            this.tokenStatus = tokenStatus;
            this.estimatedWaitTime = estimatedWaitTime;
            this.checkedInAt = checkedInAt;
        }

        // Getters and setters
        public String getTokenId() { return tokenId; }
        public void setTokenId(String tokenId) { this.tokenId = tokenId; }

        public Integer getTokenNumber() { return tokenNumber; }
        public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }

        public String getTokenStatus() { return tokenStatus; }
        public void setTokenStatus(String tokenStatus) { this.tokenStatus = tokenStatus; }

        public Integer getEstimatedWaitTime() { return estimatedWaitTime; }
        public void setEstimatedWaitTime(Integer estimatedWaitTime) { this.estimatedWaitTime = estimatedWaitTime; }

        public LocalDateTime getCheckedInAt() { return checkedInAt; }
        public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }
    }

    public static class ReminderSettingDto {
        private String type;
        private Integer minutesBefore;
        private Boolean enabled;

        public ReminderSettingDto() {}

        public ReminderSettingDto(String type, Integer minutesBefore, Boolean enabled) {
            this.type = type;
            this.minutesBefore = minutesBefore;
            this.enabled = enabled;
        }

        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public Integer getMinutesBefore() { return minutesBefore; }
        public void setMinutesBefore(Integer minutesBefore) { this.minutesBefore = minutesBefore; }

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getClinicId() { return clinicId; }
    public void setClinicId(String clinicId) { this.clinicId = clinicId; }

    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }

    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public LocalDateTime getAppointmentDateTime() { return appointmentDateTime; }
    public void setAppointmentDateTime(LocalDateTime appointmentDateTime) { 
        this.appointmentDateTime = appointmentDateTime; 
    }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getAppointmentType() { return appointmentType; }
    public void setAppointmentType(String appointmentType) { this.appointmentType = appointmentType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public TokenInfo getToken() { return token; }
    public void setToken(TokenInfo token) { this.token = token; }

    public Boolean getIsRecurring() { return isRecurring; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }

    public String getRecurrencePattern() { return recurrencePattern; }
    public void setRecurrencePattern(String recurrencePattern) { this.recurrencePattern = recurrencePattern; }

    public Integer getRecurrenceInterval() { return recurrenceInterval; }
    public void setRecurrenceInterval(Integer recurrenceInterval) { this.recurrenceInterval = recurrenceInterval; }

    public LocalDateTime getRecurrenceEndDate() { return recurrenceEndDate; }
    public void setRecurrenceEndDate(LocalDateTime recurrenceEndDate) { 
        this.recurrenceEndDate = recurrenceEndDate; 
    }

    public String getParentAppointmentId() { return parentAppointmentId; }
    public void setParentAppointmentId(String parentAppointmentId) { 
        this.parentAppointmentId = parentAppointmentId; 
    }

    public List<ReminderSettingDto> getReminders() { return reminders; }
    public void setReminders(List<ReminderSettingDto> reminders) { this.reminders = reminders; }

    public Double getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(Double estimatedCost) { this.estimatedCost = estimatedCost; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}