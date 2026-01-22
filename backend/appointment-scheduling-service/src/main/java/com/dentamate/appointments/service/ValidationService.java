package com.dentamate.appointments.service;

import com.dentamate.appointments.dto.CreateAppointmentRequest;
import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.AppointmentStatus;
import com.dentamate.appointments.model.AppointmentType;
import com.dentamate.appointments.exception.ValidationException;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class ValidationService {

    /**
     * Validate appointment creation request
     */
    public void validateAppointmentRequest(String tenantId, CreateAppointmentRequest request) {
        // Validate required fields
        if (request.getPatientId() == null || request.getPatientId().trim().isEmpty()) {
            throw new ValidationException("Patient ID is required");
        }
        
        if (request.getDoctorId() == null || request.getDoctorId().trim().isEmpty()) {
            throw new ValidationException("Doctor ID is required");
        }
        
        if (request.getClinicId() == null || request.getClinicId().trim().isEmpty()) {
            throw new ValidationException("Clinic ID is required");
        }
        
        if (request.getAppointmentDateTime() == null) {
            throw new ValidationException("Appointment date and time is required");
        }
        
        if (request.getAppointmentType() == null || request.getAppointmentType().trim().isEmpty()) {
            throw new ValidationException("Appointment type is required");
        }

        // Validate appointment type
        try {
            AppointmentType.fromValue(request.getAppointmentType());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid appointment type: " + request.getAppointmentType());
        }

        // Validate appointment time
        validateAppointmentTime(request.getAppointmentDateTime(), request.getIsWalkIn());
        
        // Validate duration
        if (request.getDurationMinutes() != null && request.getDurationMinutes() < 15) {
            throw new ValidationException("Appointment duration must be at least 15 minutes");
        }
        
        if (request.getDurationMinutes() != null && request.getDurationMinutes() > 480) {
            throw new ValidationException("Appointment duration cannot exceed 8 hours");
        }

        // Validate recurring appointment settings
        if (Boolean.TRUE.equals(request.getIsRecurring())) {
            validateRecurringAppointment(request);
        }

        // Validate estimated cost
        if (request.getEstimatedCost() != null && request.getEstimatedCost() < 0) {
            throw new ValidationException("Estimated cost cannot be negative");
        }
    }

    /**
     * Validate appointment time
     */
    public void validateAppointmentTime(LocalDateTime appointmentTime, Boolean isWalkIn) {
        LocalDateTime now = LocalDateTime.now();
        
        // For walk-ins, allow current time or future
        if (Boolean.TRUE.equals(isWalkIn)) {
            if (appointmentTime.isBefore(now.minusMinutes(15))) {
                throw new ValidationException("Walk-in appointment time cannot be more than 15 minutes in the past");
            }
        } else {
            // For regular appointments, must be in the future
            if (appointmentTime.isBefore(now.plusMinutes(30))) {
                throw new ValidationException("Appointment must be scheduled at least 30 minutes in advance");
            }
        }
        
        // Cannot be more than 1 year in the future
        if (appointmentTime.isAfter(now.plusYears(1))) {
            throw new ValidationException("Appointment cannot be scheduled more than 1 year in advance");
        }
        
        // Validate business hours (assuming 8 AM to 8 PM)
        int hour = appointmentTime.getHour();
        if (hour < 8 || hour >= 20) {
            throw new ValidationException("Appointments can only be scheduled between 8 AM and 8 PM");
        }
    }

    /**
     * Validate recurring appointment settings
     */
    public void validateRecurringAppointment(CreateAppointmentRequest request) {
        if (request.getRecurrencePattern() == null || request.getRecurrencePattern().trim().isEmpty()) {
            throw new ValidationException("Recurrence pattern is required for recurring appointments");
        }
        
        String pattern = request.getRecurrencePattern().toLowerCase();
        if (!pattern.equals("daily") && !pattern.equals("weekly") && !pattern.equals("monthly")) {
            throw new ValidationException("Invalid recurrence pattern. Must be 'daily', 'weekly', or 'monthly'");
        }
        
        if (request.getRecurrenceInterval() == null || request.getRecurrenceInterval() < 1) {
            throw new ValidationException("Recurrence interval must be at least 1");
        }
        
        if (request.getRecurrenceInterval() > 12) {
            throw new ValidationException("Recurrence interval cannot exceed 12");
        }
        
        if (request.getRecurrenceEndDate() == null) {
            throw new ValidationException("Recurrence end date is required for recurring appointments");
        }
        
        if (request.getRecurrenceEndDate().isBefore(request.getAppointmentDateTime())) {
            throw new ValidationException("Recurrence end date must be after the appointment start date");
        }
        
        // Limit recurring appointments to 2 years
        if (request.getRecurrenceEndDate().isAfter(request.getAppointmentDateTime().plusYears(2))) {
            throw new ValidationException("Recurring appointments cannot extend more than 2 years");
        }
    }

    /**
     * Validate appointment status transition
     */
    public void validateStatusTransition(AppointmentStatus currentStatus, AppointmentStatus newStatus) {
        // Define valid transitions
        boolean isValidTransition = switch (currentStatus) {
            case BOOKED -> newStatus == AppointmentStatus.CONFIRMED || 
                         newStatus == AppointmentStatus.CANCELLED || 
                         newStatus == AppointmentStatus.RESCHEDULED ||
                         newStatus == AppointmentStatus.NO_SHOW;
            
            case CONFIRMED -> newStatus == AppointmentStatus.CHECKED_IN || 
                             newStatus == AppointmentStatus.CANCELLED || 
                             newStatus == AppointmentStatus.RESCHEDULED ||
                             newStatus == AppointmentStatus.NO_SHOW;
            
            case CHECKED_IN -> newStatus == AppointmentStatus.IN_CONSULTATION || 
                              newStatus == AppointmentStatus.CANCELLED ||
                              newStatus == AppointmentStatus.NO_SHOW;
            
            case IN_CONSULTATION -> newStatus == AppointmentStatus.COMPLETED;
            
            case COMPLETED -> false; // Cannot change from completed
            
            case CANCELLED -> false; // Cannot change from cancelled
            
            case NO_SHOW -> false; // Cannot change from no-show
            
            case RESCHEDULED -> false; // Cannot change from rescheduled
        };
        
        if (!isValidTransition) {
            throw new ValidationException(
                String.format("Invalid status transition from %s to %s", 
                            currentStatus.getValue(), newStatus.getValue()));
        }
    }

    /**
     * Validate appointment reschedule
     */
    public void validateReschedule(Appointment appointment, LocalDateTime newDateTime) {
        // Check if appointment can be rescheduled
        AppointmentStatus status = AppointmentStatus.fromValue(appointment.getStatus());
        if (status == AppointmentStatus.COMPLETED || 
            status == AppointmentStatus.CANCELLED || 
            status == AppointmentStatus.NO_SHOW) {
            throw new ValidationException("Cannot reschedule appointment with status: " + status.getValue());
        }
        
        // Check reschedule timing rules
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime appointmentTime = appointment.getAppointmentDateTime();
        
        // Must reschedule at least 2 hours before original appointment
        if (appointmentTime.isBefore(now.plusHours(2))) {
            throw new ValidationException("Cannot reschedule appointment less than 2 hours before the scheduled time");
        }
        
        // Validate new appointment time
        validateAppointmentTime(newDateTime, false);
        
        // Check if rescheduling too frequently
        long daysBetween = ChronoUnit.DAYS.between(appointmentTime.toLocalDate(), newDateTime.toLocalDate());
        if (Math.abs(daysBetween) > 30) {
            throw new ValidationException("Cannot reschedule appointment more than 30 days from original date");
        }
    }

    /**
     * Validate appointment cancellation
     */
    public void validateCancellation(Appointment appointment) {
        // Check if appointment can be cancelled
        AppointmentStatus status = AppointmentStatus.fromValue(appointment.getStatus());
        if (status == AppointmentStatus.COMPLETED || 
            status == AppointmentStatus.CANCELLED || 
            status == AppointmentStatus.NO_SHOW) {
            throw new ValidationException("Cannot cancel appointment with status: " + status.getValue());
        }
        
        // Check cancellation timing rules
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime appointmentTime = appointment.getAppointmentDateTime();
        
        // Allow cancellation up to 30 minutes before appointment for regular appointments
        if (appointmentTime.isBefore(now.plusMinutes(30)) && 
            !appointment.getAppointmentType().equals(AppointmentType.WALK_IN.getValue())) {
            throw new ValidationException("Cannot cancel appointment less than 30 minutes before the scheduled time");
        }
    }

    /**
     * Validate business rules for appointment booking
     */
    public void validateBusinessRules(String tenantId, CreateAppointmentRequest request) {
        // Validate maximum appointments per day per patient
        // This would require checking existing appointments for the patient on the same day
        
        // Validate appointment type specific rules
        AppointmentType type = AppointmentType.fromValue(request.getAppointmentType());
        switch (type) {
            case EMERGENCY -> {
                // Emergency appointments can be booked anytime
                // No additional validation needed
            }
            case WALK_IN -> {
                // Walk-in appointments must be for today or within next 2 hours
                LocalDateTime now = LocalDateTime.now();
                if (request.getAppointmentDateTime().isAfter(now.plusHours(2))) {
                    throw new ValidationException("Walk-in appointments can only be scheduled within the next 2 hours");
                }
            }
            case FOLLOW_UP -> {
                // Follow-up appointments should have a reference to previous appointment
                // This would require additional validation logic
            }
            case PROCEDURE -> {
                // Procedures might require longer duration
                if (request.getDurationMinutes() != null && request.getDurationMinutes() < 60) {
                    throw new ValidationException("Procedure appointments must be at least 60 minutes");
                }
            }
        }
    }

    /**
     * Validate role-based permissions
     */
    public void validatePermissions(String userRole, String operation, Appointment appointment) {
        // This would implement role-based access control
        // For now, basic validation
        
        switch (userRole.toLowerCase()) {
            case "patient" -> {
                // Patients can only book, cancel their own appointments
                if (!operation.equals("book") && !operation.equals("cancel")) {
                    throw new ValidationException("Patients can only book or cancel appointments");
                }
            }
            case "receptionist" -> {
                // Receptionists can perform most operations within their branch
                // No additional restrictions for now
            }
            case "doctor" -> {
                // Doctors can update status of their own appointments
                if (operation.equals("update_status") && appointment != null) {
                    // Would need to check if appointment belongs to this doctor
                }
            }
            case "branch_admin" -> {
                // Branch admins have full access within their branch
                // No restrictions for now
            }
            case "central_admin" -> {
                // Central admins have full access
                // No restrictions
            }
            default -> throw new ValidationException("Invalid user role: " + userRole);
        }
    }
}