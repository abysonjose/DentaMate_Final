package com.dentamate.appointments.controller;

import com.dentamate.appointments.dto.CreateAppointmentRequest;
import com.dentamate.appointments.dto.AppointmentResponse;
import com.dentamate.appointments.model.AppointmentStatus;
import com.dentamate.appointments.service.AppointmentService;
import com.dentamate.appointments.exception.AppointmentException;
import com.dentamate.appointments.exception.ValidationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    /**
     * Create new appointment
     */
    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @Valid @RequestBody CreateAppointmentRequest request) {
        
        try {
            AppointmentResponse response = appointmentService.createAppointment(tenantId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get appointment by ID
     */
    @GetMapping("/{appointmentId}")
    public ResponseEntity<AppointmentResponse> getAppointment(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String appointmentId) {
        
        try {
            AppointmentResponse response = appointmentService.getAppointment(tenantId, appointmentId);
            return ResponseEntity.ok(response);
        } catch (AppointmentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update appointment status
     */
    @PutMapping("/{appointmentId}/status")
    public ResponseEntity<AppointmentResponse> updateAppointmentStatus(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String appointmentId,
            @RequestBody Map<String, String> statusUpdate) {
        
        try {
            String statusValue = statusUpdate.get("status");
            AppointmentStatus newStatus = AppointmentStatus.fromValue(statusValue);
            
            AppointmentResponse response = appointmentService.updateAppointmentStatus(
                tenantId, appointmentId, newStatus, userId);
            return ResponseEntity.ok(response);
        } catch (AppointmentException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Reschedule appointment
     */
    @PutMapping("/{appointmentId}/reschedule")
    public ResponseEntity<AppointmentResponse> rescheduleAppointment(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String appointmentId,
            @RequestBody Map<String, Object> rescheduleRequest) {
        
        try {
            LocalDateTime newDateTime = LocalDateTime.parse((String) rescheduleRequest.get("newDateTime"));
            String reason = (String) rescheduleRequest.get("reason");
            
            AppointmentResponse response = appointmentService.rescheduleAppointment(
                tenantId, appointmentId, newDateTime, reason, userId);
            return ResponseEntity.ok(response);
        } catch (AppointmentException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Cancel appointment
     */
    @DeleteMapping("/{appointmentId}")
    public ResponseEntity<Void> cancelAppointment(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String appointmentId,
            @RequestParam(required = false) String reason) {
        
        try {
            appointmentService.cancelAppointment(tenantId, appointmentId, reason, userId);
            return ResponseEntity.noContent().build();
        } catch (AppointmentException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get appointments by patient
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<Page<AppointmentResponse>> getAppointmentsByPatient(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String patientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "appointmentDateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        
        try {
            Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<AppointmentResponse> appointments = appointmentService
                .getAppointmentsByPatient(tenantId, patientId, pageable);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get appointments by doctor
     */
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<Page<AppointmentResponse>> getAppointmentsByDoctor(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "appointmentDateTime") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        
        try {
            Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<AppointmentResponse> appointments = appointmentService
                .getAppointmentsByDoctor(tenantId, doctorId, pageable);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get appointments by date range
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDateRange(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        try {
            List<AppointmentResponse> appointments = appointmentService
                .getAppointmentsByDateRange(tenantId, startDate, endDate);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get today's appointments for a doctor
     */
    @GetMapping("/doctor/{doctorId}/today")
    public ResponseEntity<List<AppointmentResponse>> getTodayAppointmentsByDoctor(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId) {
        
        try {
            List<AppointmentResponse> appointments = appointmentService
                .getTodayAppointmentsByDoctor(tenantId, doctorId);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create walk-in appointment
     */
    @PostMapping("/walk-in")
    public ResponseEntity<AppointmentResponse> createWalkInAppointment(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @RequestBody Map<String, String> walkInRequest) {
        
        try {
            String patientId = walkInRequest.get("patientId");
            String doctorId = walkInRequest.get("doctorId");
            String clinicId = walkInRequest.get("clinicId");
            String appointmentType = walkInRequest.getOrDefault("appointmentType", "walk_in");
            
            AppointmentResponse response = appointmentService.createWalkInAppointment(
                tenantId, patientId, doctorId, clinicId, appointmentType, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "appointment-scheduling-service",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}