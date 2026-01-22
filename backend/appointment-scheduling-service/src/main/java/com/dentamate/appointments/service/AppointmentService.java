package com.dentamate.appointments.service;

import com.dentamate.appointments.dto.CreateAppointmentRequest;
import com.dentamate.appointments.dto.AppointmentResponse;
import com.dentamate.appointments.dto.AvailableSlotResponse;
import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.AppointmentStatus;
import com.dentamate.appointments.model.Token;
import com.dentamate.appointments.repository.AppointmentRepository;
import com.dentamate.appointments.repository.TokenRepository;
import com.dentamate.appointments.exception.AppointmentException;
import com.dentamate.appointments.exception.ValidationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private ScheduleService scheduleService;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private ValidationService validationService;

    @Autowired
    private NotificationService notificationService;

    /**
     * Create a new appointment
     */
    public AppointmentResponse createAppointment(String tenantId, CreateAppointmentRequest request, String createdBy) {
        // Validate the appointment request
        validationService.validateAppointmentRequest(tenantId, request);

        // Check doctor availability
        if (!scheduleService.isDoctorAvailable(tenantId, request.getDoctorId(), 
                                             request.getAppointmentDateTime(), 
                                             request.getDurationMinutes())) {
            throw new ValidationException("Doctor is not available at the requested time");
        }

        // Check for conflicts
        if (hasConflictingAppointments(tenantId, request.getDoctorId(), 
                                     request.getAppointmentDateTime(), 
                                     request.getDurationMinutes())) {
            throw new ValidationException("Time slot conflicts with existing appointment");
        }

        // Create appointment entity
        Appointment appointment = createAppointmentEntity(tenantId, request, createdBy);
        
        // Save appointment
        appointment = appointmentRepository.save(appointment);

        // Generate token if needed
        Token token = null;
        if (shouldGenerateToken(request)) {
            token = tokenService.generateToken(tenantId, appointment);
        }

        // Update doctor schedule
        scheduleService.updateAppointmentCount(tenantId, request.getDoctorId(), 
                                             request.getAppointmentDateTime().toLocalDate(), 1);

        // Send notifications
        notificationService.sendAppointmentConfirmation(appointment);

        // Create recurring appointments if needed
        if (Boolean.TRUE.equals(request.getIsRecurring())) {
            createRecurringAppointments(tenantId, appointment, request, createdBy);
        }

        return mapToAppointmentResponse(appointment, token);
    }

    /**
     * Get appointment by ID
     */
    public AppointmentResponse getAppointment(String tenantId, String appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .filter(apt -> apt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new AppointmentException("Appointment not found"));

        Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .orElse(null);

        return mapToAppointmentResponse(appointment, token);
    }

    /**
     * Update appointment status
     */
    public AppointmentResponse updateAppointmentStatus(String tenantId, String appointmentId, 
                                                     AppointmentStatus newStatus, String updatedBy) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .filter(apt -> apt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new AppointmentException("Appointment not found"));

        AppointmentStatus currentStatus = AppointmentStatus.fromValue(appointment.getStatus());
        
        // Validate status transition
        validationService.validateStatusTransition(currentStatus, newStatus);

        // Update appointment
        appointment.setStatus(newStatus.getValue());
        appointment.setUpdatedBy(updatedBy);
        appointment = appointmentRepository.save(appointment);

        // Update token status if exists
        tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .ifPresent(token -> {
                tokenService.updateTokenStatus(tenantId, token.getId(), 
                                             mapAppointmentStatusToTokenStatus(newStatus), updatedBy);
            });

        // Send status update notifications
        notificationService.sendStatusUpdateNotification(appointment, currentStatus, newStatus);

        Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .orElse(null);

        return mapToAppointmentResponse(appointment, token);
    }

    /**
     * Reschedule appointment
     */
    public AppointmentResponse rescheduleAppointment(String tenantId, String appointmentId, 
                                                   LocalDateTime newDateTime, String reason, String updatedBy) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .filter(apt -> apt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new AppointmentException("Appointment not found"));

        LocalDateTime oldDateTime = appointment.getAppointmentDateTime();

        // Validate reschedule rules
        validationService.validateReschedule(appointment, newDateTime);

        // Check new time slot availability
        if (!scheduleService.isDoctorAvailable(tenantId, appointment.getDoctorId(), 
                                             newDateTime, appointment.getDurationMinutes())) {
            throw new ValidationException("Doctor is not available at the new requested time");
        }

        // Update appointment
        appointment.setAppointmentDateTime(newDateTime);
        appointment.setStatus(AppointmentStatus.BOOKED.getValue());
        appointment.setNotes(appointment.getNotes() + "\nRescheduled: " + reason);
        appointment.setUpdatedBy(updatedBy);
        appointment = appointmentRepository.save(appointment);

        // Update token if exists
        tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .ifPresent(token -> {
                tokenService.rescheduleToken(tenantId, token.getId(), newDateTime.toLocalDate());
            });

        // Update schedule counts
        scheduleService.updateAppointmentCount(tenantId, appointment.getDoctorId(), 
                                             oldDateTime.toLocalDate(), -1);
        scheduleService.updateAppointmentCount(tenantId, appointment.getDoctorId(), 
                                             newDateTime.toLocalDate(), 1);

        // Send reschedule notifications
        notificationService.sendRescheduleNotification(appointment, oldDateTime, newDateTime, reason);

        Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .orElse(null);

        return mapToAppointmentResponse(appointment, token);
    }

    /**
     * Cancel appointment
     */
    public void cancelAppointment(String tenantId, String appointmentId, String reason, String cancelledBy) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .filter(apt -> apt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new AppointmentException("Appointment not found"));

        // Validate cancellation rules
        validationService.validateCancellation(appointment);

        // Update appointment
        appointment.setStatus(AppointmentStatus.CANCELLED.getValue());
        appointment.setNotes(appointment.getNotes() + "\nCancelled: " + reason);
        appointment.setUpdatedBy(cancelledBy);
        appointmentRepository.save(appointment);

        // Cancel token if exists
        tokenRepository.findByTenantIdAndAppointmentId(tenantId, appointmentId)
            .ifPresent(token -> {
                tokenService.cancelToken(tenantId, token.getId(), cancelledBy);
            });

        // Update schedule count
        scheduleService.updateAppointmentCount(tenantId, appointment.getDoctorId(), 
                                             appointment.getAppointmentDateTime().toLocalDate(), -1);

        // Send cancellation notifications
        notificationService.sendCancellationNotification(appointment, reason);
    }

    /**
     * Get appointments by patient
     */
    public Page<AppointmentResponse> getAppointmentsByPatient(String tenantId, String patientId, Pageable pageable) {
        Page<Appointment> appointments = appointmentRepository.findByTenantIdAndPatientId(tenantId, patientId, pageable);
        return appointments.map(apt -> {
            Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, apt.getId()).orElse(null);
            return mapToAppointmentResponse(apt, token);
        });
    }

    /**
     * Get appointments by doctor
     */
    public Page<AppointmentResponse> getAppointmentsByDoctor(String tenantId, String doctorId, Pageable pageable) {
        Page<Appointment> appointments = appointmentRepository.findByTenantIdAndDoctorId(tenantId, doctorId, pageable);
        return appointments.map(apt -> {
            Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, apt.getId()).orElse(null);
            return mapToAppointmentResponse(apt, token);
        });
    }

    /**
     * Get appointments by date range
     */
    public List<AppointmentResponse> getAppointmentsByDateRange(String tenantId, LocalDateTime startDate, 
                                                              LocalDateTime endDate) {
        List<Appointment> appointments = appointmentRepository
            .findByTenantIdAndAppointmentDateTimeBetween(tenantId, startDate, endDate);
        
        return appointments.stream()
            .map(apt -> {
                Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, apt.getId()).orElse(null);
                return mapToAppointmentResponse(apt, token);
            })
            .toList();
    }

    /**
     * Get today's appointments for a doctor
     */
    public List<AppointmentResponse> getTodayAppointmentsByDoctor(String tenantId, String doctorId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        
        List<Appointment> appointments = appointmentRepository
            .findTodayAppointmentsByDoctor(tenantId, doctorId, startOfDay, endOfDay);
        
        return appointments.stream()
            .map(apt -> {
                Token token = tokenRepository.findByTenantIdAndAppointmentId(tenantId, apt.getId()).orElse(null);
                return mapToAppointmentResponse(apt, token);
            })
            .toList();
    }

    /**
     * Create walk-in appointment
     */
    public AppointmentResponse createWalkInAppointment(String tenantId, String patientId, String doctorId, 
                                                     String clinicId, String appointmentType, String createdBy) {
        // Find next available slot or create immediate slot
        LocalDateTime appointmentTime = scheduleService.findNextAvailableSlot(tenantId, doctorId, 30);
        
        if (appointmentTime == null) {
            // Create emergency slot
            appointmentTime = LocalDateTime.now();
        }

        CreateAppointmentRequest request = new CreateAppointmentRequest();
        request.setPatientId(patientId);
        request.setDoctorId(doctorId);
        request.setClinicId(clinicId);
        request.setAppointmentDateTime(appointmentTime);
        request.setAppointmentType(appointmentType);
        request.setIsWalkIn(true);

        return createAppointment(tenantId, request, createdBy);
    }

    // Private helper methods

    private boolean hasConflictingAppointments(String tenantId, String doctorId, 
                                             LocalDateTime startTime, Integer durationMinutes) {
        LocalDateTime endTime = startTime.plusMinutes(durationMinutes);
        List<Appointment> conflicts = appointmentRepository
            .findConflictingAppointments(tenantId, doctorId, startTime, endTime);
        return !conflicts.isEmpty();
    }

    private Appointment createAppointmentEntity(String tenantId, CreateAppointmentRequest request, String createdBy) {
        Appointment appointment = new Appointment();
        appointment.setTenantId(tenantId);
        appointment.setPatientId(request.getPatientId());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setClinicId(request.getClinicId());
        appointment.setBranchId(request.getBranchId());
        appointment.setDepartmentId(request.getDepartmentId());
        appointment.setRoomId(request.getRoomId());
        appointment.setAppointmentDateTime(request.getAppointmentDateTime());
        appointment.setDurationMinutes(request.getDurationMinutes());
        appointment.setAppointmentType(request.getAppointmentType());
        appointment.setStatus(AppointmentStatus.BOOKED.getValue());
        appointment.setPriority(request.getPriority());
        appointment.setReason(request.getReason());
        appointment.setNotes(request.getNotes());
        appointment.setIsRecurring(request.getIsRecurring());
        appointment.setRecurrencePattern(request.getRecurrencePattern());
        appointment.setRecurrenceInterval(request.getRecurrenceInterval());
        appointment.setRecurrenceEndDate(request.getRecurrenceEndDate());
        appointment.setEstimatedCost(request.getEstimatedCost());
        appointment.setCreatedBy(createdBy);
        return appointment;
    }

    private boolean shouldGenerateToken(CreateAppointmentRequest request) {
        // Generate token for same-day appointments or walk-ins
        return request.getAppointmentDateTime().toLocalDate().equals(LocalDate.now()) || 
               Boolean.TRUE.equals(request.getIsWalkIn());
    }

    private void createRecurringAppointments(String tenantId, Appointment parentAppointment, 
                                           CreateAppointmentRequest request, String createdBy) {
        // Implementation for creating recurring appointments
        // This would create multiple appointments based on recurrence pattern
    }

    private AppointmentResponse mapToAppointmentResponse(Appointment appointment, Token token) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setTenantId(appointment.getTenantId());
        response.setPatientId(appointment.getPatientId());
        response.setDoctorId(appointment.getDoctorId());
        response.setClinicId(appointment.getClinicId());
        response.setBranchId(appointment.getBranchId());
        response.setDepartmentId(appointment.getDepartmentId());
        response.setRoomId(appointment.getRoomId());
        response.setAppointmentDateTime(appointment.getAppointmentDateTime());
        response.setDurationMinutes(appointment.getDurationMinutes());
        response.setAppointmentType(appointment.getAppointmentType());
        response.setStatus(appointment.getStatus());
        response.setPriority(appointment.getPriority());
        response.setReason(appointment.getReason());
        response.setNotes(appointment.getNotes());
        response.setIsRecurring(appointment.getIsRecurring());
        response.setRecurrencePattern(appointment.getRecurrencePattern());
        response.setRecurrenceInterval(appointment.getRecurrenceInterval());
        response.setRecurrenceEndDate(appointment.getRecurrenceEndDate());
        response.setParentAppointmentId(appointment.getParentAppointmentId());
        response.setEstimatedCost(appointment.getEstimatedCost());
        response.setPaymentStatus(appointment.getPaymentStatus());
        response.setCreatedAt(appointment.getCreatedAt());
        response.setUpdatedAt(appointment.getUpdatedAt());
        response.setCreatedBy(appointment.getCreatedBy());
        response.setUpdatedBy(appointment.getUpdatedBy());

        if (token != null) {
            AppointmentResponse.TokenInfo tokenInfo = new AppointmentResponse.TokenInfo();
            tokenInfo.setTokenId(token.getId());
            tokenInfo.setTokenNumber(token.getTokenNumber());
            tokenInfo.setTokenStatus(token.getStatus().getValue());
            tokenInfo.setEstimatedWaitTime(token.getEstimatedWaitTime());
            tokenInfo.setCheckedInAt(token.getCheckedInAt());
            response.setToken(tokenInfo);
        }

        return response;
    }

    private com.dentamate.appointments.model.TokenStatus mapAppointmentStatusToTokenStatus(AppointmentStatus appointmentStatus) {
        return switch (appointmentStatus) {
            case CHECKED_IN -> com.dentamate.appointments.model.TokenStatus.WAITING;
            case IN_CONSULTATION -> com.dentamate.appointments.model.TokenStatus.IN_PROGRESS;
            case COMPLETED -> com.dentamate.appointments.model.TokenStatus.COMPLETED;
            case CANCELLED -> com.dentamate.appointments.model.TokenStatus.CANCELLED;
            default -> com.dentamate.appointments.model.TokenStatus.WAITING;
        };
    }
}