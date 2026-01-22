package com.dentamate.appointments.controller;

import com.dentamate.appointments.dto.AvailableSlotResponse;
import com.dentamate.appointments.model.DoctorSchedule;
import com.dentamate.appointments.service.ScheduleService;
import com.dentamate.appointments.exception.ScheduleException;
import com.dentamate.appointments.exception.ValidationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/schedules")
@CrossOrigin(origins = "*")
public class ScheduleController {

    @Autowired
    private ScheduleService scheduleService;

    /**
     * Get available slots for a doctor on a specific date
     */
    @GetMapping("/doctor/{doctorId}/slots")
    public ResponseEntity<AvailableSlotResponse> getAvailableSlots(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer duration) {
        
        try {
            AvailableSlotResponse response = scheduleService.getAvailableSlots(tenantId, doctorId, date, duration);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get available slots for all doctors in a clinic
     */
    @GetMapping("/clinic/{clinicId}/slots")
    public ResponseEntity<List<AvailableSlotResponse>> getAvailableSlotsByClinic(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String clinicId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer duration) {
        
        try {
            List<AvailableSlotResponse> response = scheduleService
                .getAvailableSlotsByClinic(tenantId, clinicId, date, duration);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Find next available slot for a doctor
     */
    @GetMapping("/doctor/{doctorId}/next-available")
    public ResponseEntity<Map<String, Object>> findNextAvailableSlot(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(defaultValue = "30") Integer duration) {
        
        try {
            LocalDateTime nextSlot = scheduleService.findNextAvailableSlot(tenantId, doctorId, duration);
            
            if (nextSlot != null) {
                return ResponseEntity.ok(Map.of(
                    "available", true,
                    "nextAvailableSlot", nextSlot.toString(),
                    "date", nextSlot.toLocalDate().toString(),
                    "time", nextSlot.toLocalTime().toString()
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "available", false,
                    "message", "No available slots found in the next 30 days"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create or update doctor schedule
     */
    @PostMapping("/doctor/{doctorId}")
    public ResponseEntity<DoctorSchedule> createOrUpdateSchedule(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestBody Map<String, Object> scheduleRequest) {
        
        try {
            String clinicId = (String) scheduleRequest.get("clinicId");
            LocalDate date = LocalDate.parse((String) scheduleRequest.get("date"));
            LocalTime startTime = LocalTime.parse((String) scheduleRequest.get("startTime"));
            LocalTime endTime = LocalTime.parse((String) scheduleRequest.get("endTime"));
            
            DoctorSchedule schedule = scheduleService.createOrUpdateSchedule(
                tenantId, doctorId, clinicId, date, startTime, endTime, userId);
            
            return ResponseEntity.ok(schedule);
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Block time slot
     */
    @PostMapping("/doctor/{doctorId}/block")
    public ResponseEntity<DoctorSchedule> blockTimeSlot(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestBody Map<String, Object> blockRequest) {
        
        try {
            LocalDate date = LocalDate.parse((String) blockRequest.get("date"));
            LocalTime startTime = LocalTime.parse((String) blockRequest.get("startTime"));
            LocalTime endTime = LocalTime.parse((String) blockRequest.get("endTime"));
            String reason = (String) blockRequest.get("reason");
            
            DoctorSchedule schedule = scheduleService.blockTimeSlot(
                tenantId, doctorId, date, startTime, endTime, reason, userId);
            
            return ResponseEntity.ok(schedule);
        } catch (ScheduleException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Add break to schedule
     */
    @PostMapping("/doctor/{doctorId}/break")
    public ResponseEntity<DoctorSchedule> addBreak(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestBody Map<String, Object> breakRequest) {
        
        try {
            LocalDate date = LocalDate.parse((String) breakRequest.get("date"));
            LocalTime startTime = LocalTime.parse((String) breakRequest.get("startTime"));
            LocalTime endTime = LocalTime.parse((String) breakRequest.get("endTime"));
            String reason = (String) breakRequest.getOrDefault("reason", "Break");
            
            DoctorSchedule schedule = scheduleService.addBreak(
                tenantId, doctorId, date, startTime, endTime, reason, userId);
            
            return ResponseEntity.ok(schedule);
        } catch (ScheduleException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Mark doctor as unavailable
     */
    @PostMapping("/doctor/{doctorId}/unavailable")
    public ResponseEntity<DoctorSchedule> markDoctorUnavailable(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestBody Map<String, Object> unavailableRequest) {
        
        try {
            LocalDate date = LocalDate.parse((String) unavailableRequest.get("date"));
            String reason = (String) unavailableRequest.get("reason");
            
            DoctorSchedule schedule = scheduleService.markDoctorUnavailable(
                tenantId, doctorId, date, reason, userId);
            
            return ResponseEntity.ok(schedule);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get doctor schedules for date range
     */
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<DoctorSchedule>> getDoctorSchedules(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            List<DoctorSchedule> schedules = scheduleService
                .getDoctorSchedules(tenantId, doctorId, startDate, endDate);
            return ResponseEntity.ok(schedules);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get available doctors for a date
     */
    @GetMapping("/available-doctors")
    public ResponseEntity<List<DoctorSchedule>> getAvailableDoctors(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String clinicId) {
        
        try {
            List<DoctorSchedule> schedules;
            if (clinicId != null) {
                schedules = scheduleService.getAvailableDoctorsByClinic(tenantId, clinicId, date);
            } else {
                schedules = scheduleService.getAvailableDoctors(tenantId, date);
            }
            return ResponseEntity.ok(schedules);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Check if doctor is available at specific time
     */
    @GetMapping("/doctor/{doctorId}/availability")
    public ResponseEntity<Map<String, Object>> checkDoctorAvailability(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime appointmentTime,
            @RequestParam(defaultValue = "30") Integer duration) {
        
        try {
            boolean isAvailable = scheduleService.isDoctorAvailable(tenantId, doctorId, appointmentTime, duration);
            
            return ResponseEntity.ok(Map.of(
                "available", isAvailable,
                "doctorId", doctorId,
                "appointmentTime", appointmentTime.toString(),
                "duration", duration
            ));
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
            "service", "schedule-service",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}