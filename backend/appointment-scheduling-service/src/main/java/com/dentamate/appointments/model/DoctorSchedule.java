package com.dentamate.appointments.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;

@Document(collection = "doctor_schedules")
@CompoundIndex(def = "{'doctorId': 1, 'date': 1}", unique = true)
public class DoctorSchedule {
    
    @Id
    private String id;
    
    @NotBlank
    @Indexed
    private String tenantId;
    
    @NotBlank
    private String doctorId;
    
    @NotBlank
    private String clinicId;
    
    private String branchId;
    private String departmentId;
    
    @NotNull
    private LocalDate date;
    
    private Boolean isAvailable = true;
    
    // Working hours for the day
    private LocalTime startTime;
    private LocalTime endTime;
    
    // Break times
    private List<BreakSlot> breaks;
    
    // Blocked time slots
    private List<BlockedSlot> blockedSlots;
    
    // Default consultation duration in minutes
    private Integer defaultConsultationDuration = 30;
    
    // Maximum appointments per day
    private Integer maxAppointments;
    
    // Current appointment count
    private Integer currentAppointmentCount = 0;
    
    // Emergency slots reserved
    private Integer emergencySlots = 2;
    
    // Leave/unavailability reason
    private String unavailabilityReason;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private String createdBy;
    private String updatedBy;

    // Constructors
    public DoctorSchedule() {}

    public DoctorSchedule(String tenantId, String doctorId, String clinicId, LocalDate date) {
        this.tenantId = tenantId;
        this.doctorId = doctorId;
        this.clinicId = clinicId;
        this.date = date;
    }

    // Inner classes
    public static class BreakSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private String reason;

        public BreakSlot() {}

        public BreakSlot(LocalTime startTime, LocalTime endTime, String reason) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.reason = reason;
        }

        // Getters and setters
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class BlockedSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private String reason;
        private String blockedBy;

        public BlockedSlot() {}

        public BlockedSlot(LocalTime startTime, LocalTime endTime, String reason, String blockedBy) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.reason = reason;
            this.blockedBy = blockedBy;
        }

        // Getters and setters
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public String getBlockedBy() { return blockedBy; }
        public void setBlockedBy(String blockedBy) { this.blockedBy = blockedBy; }
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getClinicId() { return clinicId; }
    public void setClinicId(String clinicId) { this.clinicId = clinicId; }

    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }

    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public List<BreakSlot> getBreaks() { return breaks; }
    public void setBreaks(List<BreakSlot> breaks) { this.breaks = breaks; }

    public List<BlockedSlot> getBlockedSlots() { return blockedSlots; }
    public void setBlockedSlots(List<BlockedSlot> blockedSlots) { this.blockedSlots = blockedSlots; }

    public Integer getDefaultConsultationDuration() { return defaultConsultationDuration; }
    public void setDefaultConsultationDuration(Integer defaultConsultationDuration) { 
        this.defaultConsultationDuration = defaultConsultationDuration; 
    }

    public Integer getMaxAppointments() { return maxAppointments; }
    public void setMaxAppointments(Integer maxAppointments) { this.maxAppointments = maxAppointments; }

    public Integer getCurrentAppointmentCount() { return currentAppointmentCount; }
    public void setCurrentAppointmentCount(Integer currentAppointmentCount) { 
        this.currentAppointmentCount = currentAppointmentCount; 
    }

    public Integer getEmergencySlots() { return emergencySlots; }
    public void setEmergencySlots(Integer emergencySlots) { this.emergencySlots = emergencySlots; }

    public String getUnavailabilityReason() { return unavailabilityReason; }
    public void setUnavailabilityReason(String unavailabilityReason) { 
        this.unavailabilityReason = unavailabilityReason; 
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}