package com.dentamate.appointments.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "appointments")
public class Appointment {
    
    @Id
    private String id;
    
    @NotBlank
    @Indexed
    private String tenantId;
    
    @NotBlank
    private String patientId;
    
    @NotBlank
    private String doctorId;
    
    @NotBlank
    private String clinicId;
    
    private String branchId;
    private String departmentId;
    private String roomId;
    
    @NotNull
    private LocalDateTime appointmentDateTime;
    
    private Integer durationMinutes = 30;
    
    @NotBlank
    private String appointmentType; // consultation, follow-up, procedure, emergency
    
    private String status = "scheduled"; // scheduled, confirmed, in-progress, completed, cancelled, no-show
    
    private String priority = "normal"; // low, normal, high, urgent
    
    private String reason;
    private String notes;
    
    // Recurring appointment fields
    private Boolean isRecurring = false;
    private String recurrencePattern; // daily, weekly, monthly
    private Integer recurrenceInterval;
    private LocalDateTime recurrenceEndDate;
    private String parentAppointmentId;
    
    // Reminder settings
    private List<ReminderSetting> reminders;
    
    // Payment and billing
    private Double estimatedCost;
    private String paymentStatus = "pending";
    
    // Metadata
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private String createdBy;
    private String updatedBy;

    // Constructors
    public Appointment() {}

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

    public LocalDateTime getAppointmentDateTime() { return appointmentDateTime; }
    public void setAppointmentDateTime(LocalDateTime appointmentDateTime) { 
        this.appointmentDateTime = appointmentDateTime; 
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAppointmentType() { return appointmentType; }
    public void setAppointmentType(String appointmentType) { this.appointmentType = appointmentType; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Inner class for reminder settings
    public static class ReminderSetting {
        private String type; // sms, email, whatsapp
        private Integer minutesBefore;
        private Boolean enabled = true;

        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public Integer getMinutesBefore() { return minutesBefore; }
        public void setMinutesBefore(Integer minutesBefore) { this.minutesBefore = minutesBefore; }

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }
}