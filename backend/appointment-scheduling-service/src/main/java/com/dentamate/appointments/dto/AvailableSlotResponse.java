package com.dentamate.appointments.dto;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

public class AvailableSlotResponse {
    
    private LocalDate date;
    private String doctorId;
    private String doctorName;
    private String departmentId;
    private String departmentName;
    private List<TimeSlot> availableSlots;
    private Integer totalSlots;
    private Integer bookedSlots;
    private Integer availableSlots;

    // Constructors
    public AvailableSlotResponse() {}

    public AvailableSlotResponse(LocalDate date, String doctorId, String doctorName) {
        this.date = date;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
    }

    // Inner class for time slots
    public static class TimeSlot {
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Integer durationMinutes;
        private Boolean isAvailable;
        private String slotType; // regular, emergency, walk-in
        private String unavailabilityReason;

        public TimeSlot() {}

        public TimeSlot(LocalDateTime startTime, LocalDateTime endTime, 
                       Integer durationMinutes, Boolean isAvailable) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.durationMinutes = durationMinutes;
            this.isAvailable = isAvailable;
        }

        // Getters and setters
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

        public LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

        public Integer getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

        public Boolean getIsAvailable() { return isAvailable; }
        public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

        public String getSlotType() { return slotType; }
        public void setSlotType(String slotType) { this.slotType = slotType; }

        public String getUnavailabilityReason() { return unavailabilityReason; }
        public void setUnavailabilityReason(String unavailabilityReason) { 
            this.unavailabilityReason = unavailabilityReason; 
        }
    }

    // Getters and Setters
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public List<TimeSlot> getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(List<TimeSlot> availableSlots) { this.availableSlots = availableSlots; }

    public Integer getTotalSlots() { return totalSlots; }
    public void setTotalSlots(Integer totalSlots) { this.totalSlots = totalSlots; }

    public Integer getBookedSlots() { return bookedSlots; }
    public void setBookedSlots(Integer bookedSlots) { this.bookedSlots = bookedSlots; }

    public Integer getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(Integer availableSlots) { this.availableSlots = availableSlots; }
}