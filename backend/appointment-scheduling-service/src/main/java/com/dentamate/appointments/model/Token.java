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

@Document(collection = "tokens")
@CompoundIndex(def = "{'doctorId': 1, 'date': 1, 'tokenNumber': 1}", unique = true)
public class Token {
    
    @Id
    private String id;
    
    @NotBlank
    @Indexed
    private String tenantId;
    
    @NotBlank
    private String appointmentId;
    
    @NotBlank
    private String patientId;
    
    @NotBlank
    private String doctorId;
    
    @NotBlank
    private String clinicId;
    
    private String branchId;
    private String departmentId;
    
    @NotNull
    private LocalDate date;
    
    @NotNull
    private Integer tokenNumber;
    
    private TokenStatus status = TokenStatus.WAITING;
    
    private Boolean isWalkIn = false;
    
    private Integer estimatedWaitTime; // in minutes
    
    private LocalDateTime checkedInAt;
    private LocalDateTime calledAt;
    private LocalDateTime consultationStartedAt;
    private LocalDateTime consultationEndedAt;
    
    private Integer priority = 0; // 0 = normal, higher numbers = higher priority
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private String createdBy;
    private String updatedBy;

    // Constructors
    public Token() {}

    public Token(String tenantId, String appointmentId, String patientId, String doctorId, 
                 String clinicId, LocalDate date, Integer tokenNumber) {
        this.tenantId = tenantId;
        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.clinicId = clinicId;
        this.date = date;
        this.tokenNumber = tokenNumber;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }

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

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Integer getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }

    public TokenStatus getStatus() { return status; }
    public void setStatus(TokenStatus status) { this.status = status; }

    public Boolean getIsWalkIn() { return isWalkIn; }
    public void setIsWalkIn(Boolean isWalkIn) { this.isWalkIn = isWalkIn; }

    public Integer getEstimatedWaitTime() { return estimatedWaitTime; }
    public void setEstimatedWaitTime(Integer estimatedWaitTime) { this.estimatedWaitTime = estimatedWaitTime; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public LocalDateTime getCalledAt() { return calledAt; }
    public void setCalledAt(LocalDateTime calledAt) { this.calledAt = calledAt; }

    public LocalDateTime getConsultationStartedAt() { return consultationStartedAt; }
    public void setConsultationStartedAt(LocalDateTime consultationStartedAt) { 
        this.consultationStartedAt = consultationStartedAt; 
    }

    public LocalDateTime getConsultationEndedAt() { return consultationEndedAt; }
    public void setConsultationEndedAt(LocalDateTime consultationEndedAt) { 
        this.consultationEndedAt = consultationEndedAt; 
    }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}