package com.dentamate.appointments.service;

import com.dentamate.appointments.dto.AvailableSlotResponse;
import com.dentamate.appointments.model.DoctorSchedule;
import com.dentamate.appointments.repository.DoctorScheduleRepository;
import com.dentamate.appointments.repository.AppointmentRepository;
import com.dentamate.appointments.exception.ScheduleException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ScheduleService {

    @Autowired
    private DoctorScheduleRepository scheduleRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    /**
     * Check if doctor is available at specific time
     */
    public boolean isDoctorAvailable(String tenantId, String doctorId, LocalDateTime appointmentTime, Integer durationMinutes) {
        LocalDate date = appointmentTime.toLocalDate();
        LocalTime time = appointmentTime.toLocalTime();
        
        // Get doctor's schedule for the date
        Optional<DoctorSchedule> scheduleOpt = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date);
        
        if (scheduleOpt.isEmpty()) {
            return false; // No schedule means not available
        }
        
        DoctorSchedule schedule = scheduleOpt.get();
        
        // Check if doctor is available on this date
        if (!schedule.getIsAvailable()) {
            return false;
        }
        
        // Check if time is within working hours
        if (time.isBefore(schedule.getStartTime()) || time.isAfter(schedule.getEndTime())) {
            return false;
        }
        
        LocalTime endTime = time.plusMinutes(durationMinutes);
        if (endTime.isAfter(schedule.getEndTime())) {
            return false;
        }
        
        // Check if time conflicts with breaks
        if (schedule.getBreaks() != null) {
            for (DoctorSchedule.BreakSlot breakSlot : schedule.getBreaks()) {
                if (isTimeOverlapping(time, endTime, breakSlot.getStartTime(), breakSlot.getEndTime())) {
                    return false;
                }
            }
        }
        
        // Check if time conflicts with blocked slots
        if (schedule.getBlockedSlots() != null) {
            for (DoctorSchedule.BlockedSlot blockedSlot : schedule.getBlockedSlots()) {
                if (isTimeOverlapping(time, endTime, blockedSlot.getStartTime(), blockedSlot.getEndTime())) {
                    return false;
                }
            }
        }
        
        // Check if maximum appointments reached
        if (schedule.getMaxAppointments() != null && 
            schedule.getCurrentAppointmentCount() >= schedule.getMaxAppointments()) {
            return false;
        }
        
        return true;
    }

    /**
     * Get available time slots for a doctor on a specific date
     */
    public AvailableSlotResponse getAvailableSlots(String tenantId, String doctorId, LocalDate date, 
                                                  Integer consultationDuration) {
        Optional<DoctorSchedule> scheduleOpt = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date);
        
        AvailableSlotResponse response = new AvailableSlotResponse(date, doctorId, "Doctor Name"); // TODO: Get doctor name
        
        if (scheduleOpt.isEmpty() || !scheduleOpt.get().getIsAvailable()) {
            response.setAvailableSlots(new ArrayList<>());
            return response;
        }
        
        DoctorSchedule schedule = scheduleOpt.get();
        Integer duration = consultationDuration != null ? consultationDuration : schedule.getDefaultConsultationDuration();
        
        List<AvailableSlotResponse.TimeSlot> slots = generateTimeSlots(tenantId, schedule, duration);
        response.setAvailableSlots(slots);
        response.setTotalSlots(slots.size());
        response.setBookedSlots((int) slots.stream().filter(slot -> !slot.getIsAvailable()).count());
        response.setAvailableSlots((int) slots.stream().filter(AvailableSlotResponse.TimeSlot::getIsAvailable).count());
        
        return response;
    }

    /**
     * Get available slots for multiple doctors
     */
    public List<AvailableSlotResponse> getAvailableSlotsByClinic(String tenantId, String clinicId, LocalDate date, 
                                                               Integer consultationDuration) {
        List<DoctorSchedule> schedules = scheduleRepository
            .findAvailableDoctorsByClinicAndDate(tenantId, clinicId, date);
        
        return schedules.stream()
            .map(schedule -> getAvailableSlots(tenantId, schedule.getDoctorId(), date, consultationDuration))
            .toList();
    }

    /**
     * Find next available slot for a doctor
     */
    public LocalDateTime findNextAvailableSlot(String tenantId, String doctorId, Integer durationMinutes) {
        LocalDate currentDate = LocalDate.now();
        LocalDate endDate = currentDate.plusDays(30); // Search for next 30 days
        
        for (LocalDate date = currentDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            AvailableSlotResponse slots = getAvailableSlots(tenantId, doctorId, date, durationMinutes);
            
            Optional<AvailableSlotResponse.TimeSlot> availableSlot = slots.getAvailableSlots().stream()
                .filter(AvailableSlotResponse.TimeSlot::getIsAvailable)
                .findFirst();
            
            if (availableSlot.isPresent()) {
                return availableSlot.get().getStartTime();
            }
        }
        
        return null; // No available slot found
    }

    /**
     * Create or update doctor schedule
     */
    public DoctorSchedule createOrUpdateSchedule(String tenantId, String doctorId, String clinicId, 
                                                LocalDate date, LocalTime startTime, LocalTime endTime, 
                                                String createdBy) {
        Optional<DoctorSchedule> existingSchedule = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date);
        
        DoctorSchedule schedule;
        if (existingSchedule.isPresent()) {
            schedule = existingSchedule.get();
            schedule.setUpdatedBy(createdBy);
        } else {
            schedule = new DoctorSchedule(tenantId, doctorId, clinicId, date);
            schedule.setCreatedBy(createdBy);
        }
        
        schedule.setStartTime(startTime);
        schedule.setEndTime(endTime);
        schedule.setIsAvailable(true);
        
        return scheduleRepository.save(schedule);
    }

    /**
     * Block time slot
     */
    public DoctorSchedule blockTimeSlot(String tenantId, String doctorId, LocalDate date, 
                                       LocalTime startTime, LocalTime endTime, String reason, String blockedBy) {
        DoctorSchedule schedule = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date)
            .orElseThrow(() -> new ScheduleException("Schedule not found"));
        
        DoctorSchedule.BlockedSlot blockedSlot = new DoctorSchedule.BlockedSlot(startTime, endTime, reason, blockedBy);
        
        if (schedule.getBlockedSlots() == null) {
            schedule.setBlockedSlots(new ArrayList<>());
        }
        schedule.getBlockedSlots().add(blockedSlot);
        schedule.setUpdatedBy(blockedBy);
        
        return scheduleRepository.save(schedule);
    }

    /**
     * Add break to schedule
     */
    public DoctorSchedule addBreak(String tenantId, String doctorId, LocalDate date, 
                                  LocalTime startTime, LocalTime endTime, String reason, String updatedBy) {
        DoctorSchedule schedule = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date)
            .orElseThrow(() -> new ScheduleException("Schedule not found"));
        
        DoctorSchedule.BreakSlot breakSlot = new DoctorSchedule.BreakSlot(startTime, endTime, reason);
        
        if (schedule.getBreaks() == null) {
            schedule.setBreaks(new ArrayList<>());
        }
        schedule.getBreaks().add(breakSlot);
        schedule.setUpdatedBy(updatedBy);
        
        return scheduleRepository.save(schedule);
    }

    /**
     * Mark doctor as unavailable
     */
    public DoctorSchedule markDoctorUnavailable(String tenantId, String doctorId, LocalDate date, 
                                               String reason, String updatedBy) {
        DoctorSchedule schedule = scheduleRepository
            .findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date)
            .orElse(new DoctorSchedule(tenantId, doctorId, null, date));
        
        schedule.setIsAvailable(false);
        schedule.setUnavailabilityReason(reason);
        schedule.setUpdatedBy(updatedBy);
        
        return scheduleRepository.save(schedule);
    }

    /**
     * Update appointment count
     */
    public void updateAppointmentCount(String tenantId, String doctorId, LocalDate date, int increment) {
        scheduleRepository.findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date)
            .ifPresent(schedule -> {
                int newCount = Math.max(0, schedule.getCurrentAppointmentCount() + increment);
                schedule.setCurrentAppointmentCount(newCount);
                scheduleRepository.save(schedule);
            });
    }

    /**
     * Get doctor schedules for date range
     */
    public List<DoctorSchedule> getDoctorSchedules(String tenantId, String doctorId, 
                                                  LocalDate startDate, LocalDate endDate) {
        return scheduleRepository.findByTenantIdAndDoctorIdAndDateBetween(tenantId, doctorId, startDate, endDate);
    }

    /**
     * Get available doctors for a date
     */
    public List<DoctorSchedule> getAvailableDoctors(String tenantId, LocalDate date) {
        return scheduleRepository.findAvailableDoctorsByDate(tenantId, date);
    }

    /**
     * Get available doctors for a clinic and date
     */
    public List<DoctorSchedule> getAvailableDoctorsByClinic(String tenantId, String clinicId, LocalDate date) {
        return scheduleRepository.findAvailableDoctorsByClinicAndDate(tenantId, clinicId, date);
    }

    // Private helper methods

    private boolean isTimeOverlapping(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private List<AvailableSlotResponse.TimeSlot> generateTimeSlots(String tenantId, DoctorSchedule schedule, 
                                                                  Integer duration) {
        List<AvailableSlotResponse.TimeSlot> slots = new ArrayList<>();
        
        LocalTime currentTime = schedule.getStartTime();
        LocalTime endTime = schedule.getEndTime();
        LocalDate date = schedule.getDate();
        
        while (currentTime.plusMinutes(duration).isBefore(endTime) || 
               currentTime.plusMinutes(duration).equals(endTime)) {
            
            LocalDateTime slotStart = date.atTime(currentTime);
            LocalDateTime slotEnd = slotStart.plusMinutes(duration);
            
            AvailableSlotResponse.TimeSlot slot = new AvailableSlotResponse.TimeSlot();
            slot.setStartTime(slotStart);
            slot.setEndTime(slotEnd);
            slot.setDurationMinutes(duration);
            slot.setSlotType("regular");
            
            // Check if slot is available
            boolean isAvailable = isDoctorAvailable(tenantId, schedule.getDoctorId(), slotStart, duration);
            
            // Check if slot is already booked
            if (isAvailable) {
                List<com.dentamate.appointments.model.Appointment> conflicts = appointmentRepository
                    .findConflictingAppointments(tenantId, schedule.getDoctorId(), slotStart, slotEnd);
                isAvailable = conflicts.isEmpty();
            }
            
            slot.setIsAvailable(isAvailable);
            
            if (!isAvailable) {
                slot.setUnavailabilityReason("Slot not available");
            }
            
            slots.add(slot);
            currentTime = currentTime.plusMinutes(duration);
        }
        
        return slots;
    }
}