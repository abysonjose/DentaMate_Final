package com.dentamate.appointments.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import java.util.List;

public class CreateAppointmentRequest {
    
    @NotBlank(message = "Patient ID is required")
    private String patientId;
    
    @NotBlank(message = "Doctor ID is required")
    private String doctorId;
    
    @NotBlank(message = "Clinic ID is required")
    private String clinicId;
    
    private String branchId;
    private String departmentId;
    private String roomId;
    
    @NotNull(message = "Appointment date and time is required")
    @Future(message = "Appointment must be in the future")
    private LocalDateTime appointmentDateTime;
    
    @Min(value = 15, message = "Duration must be at least 15 minutes")
    private Integer durationMinutes = 30;
    
    @NotBlank(message = "Appointment type is required")
    private String appointmentType;
    
    private String priority = "normal";
    private String reason;
    private String notes;
    
    // Recurring appointment fields
    private Boolean isRecurring = false;
    private String recurrencePattern;
    private Integer recurrenceInterval;
    private LocalDateTime recurrenceEndDate;
    
    // Reminder settings
    private List<ReminderSettingDto> reminders;
    
    private Double estimatedCost;
    
    // Walk-in specific
    private Boolean isWalkIn = false;

    // Constructors
    public CreateAppointmentRequest() {}

    // Getters and Setters
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

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

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

    public List<ReminderSettingDto> getReminders() { return reminders; }
    public void setReminders(List<ReminderSettingDto> reminders) { this.reminders = reminders; }

    public Double getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(Double estimatedCost) { this.estimatedCost = estimatedCost; }

    public Boolean getIsWalkIn() { return isWalkIn; }
    public void setIsWalkIn(Boolean isWalkIn) { this.isWalkIn = isWalkIn; }

    // Inner class for reminder settings
    public static class ReminderSettingDto {
        private String type;
        private Integer minutesBefore;
        private Boolean enabled = true;

        public ReminderSettingDto() {}

        public ReminderSettingDto(String type, Integer minutesBefore, Boolean enabled) {
            this.type = type;
            this.minutesBefore = minutesBefore;
            this.enabled = enabled;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public Integer getMinutesBefore() { return minutesBefore; }
        public void setMinutesBefore(Integer minutesBefore) { this.minutesBefore = minutesBefore; }

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }
}