package com.dentamate.appointments.repository;

import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.AppointmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    
    // Find appointments by tenant
    List<Appointment> findByTenantId(String tenantId);
    
    // Find appointments by patient
    List<Appointment> findByTenantIdAndPatientId(String tenantId, String patientId);
    Page<Appointment> findByTenantIdAndPatientId(String tenantId, String patientId, Pageable pageable);
    
    // Find appointments by doctor
    List<Appointment> findByTenantIdAndDoctorId(String tenantId, String doctorId);
    Page<Appointment> findByTenantIdAndDoctorId(String tenantId, String doctorId, Pageable pageable);
    
    // Find appointments by clinic/branch
    List<Appointment> findByTenantIdAndClinicId(String tenantId, String clinicId);
    List<Appointment> findByTenantIdAndClinicIdAndBranchId(String tenantId, String clinicId, String branchId);
    
    // Find appointments by date range
    @Query("{'tenantId': ?0, 'appointmentDateTime': {$gte: ?1, $lte: ?2}}")
    List<Appointment> findByTenantIdAndAppointmentDateTimeBetween(
        String tenantId, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find appointments by doctor and date range
    @Query("{'tenantId': ?0, 'doctorId': ?1, 'appointmentDateTime': {$gte: ?2, $lte: ?3}}")
    List<Appointment> findByTenantIdAndDoctorIdAndAppointmentDateTimeBetween(
        String tenantId, String doctorId, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find appointments by status
    List<Appointment> findByTenantIdAndStatus(String tenantId, String status);
    
    // Find appointments by multiple statuses
    @Query("{'tenantId': ?0, 'status': {$in: ?1}}")
    List<Appointment> findByTenantIdAndStatusIn(String tenantId, List<String> statuses);
    
    // Find conflicting appointments (for validation)
    @Query("{'tenantId': ?0, 'doctorId': ?1, 'appointmentDateTime': {$gte: ?2, $lte: ?3}, 'status': {$nin: ['cancelled', 'no_show']}}")
    List<Appointment> findConflictingAppointments(
        String tenantId, String doctorId, LocalDateTime startTime, LocalDateTime endTime);
    
    // Find appointments for today
    @Query("{'tenantId': ?0, 'appointmentDateTime': {$gte: ?1, $lt: ?2}}")
    List<Appointment> findTodayAppointments(String tenantId, LocalDateTime startOfDay, LocalDateTime endOfDay);
    
    // Find appointments by doctor for today
    @Query("{'tenantId': ?0, 'doctorId': ?1, 'appointmentDateTime': {$gte: ?2, $lt: ?3}}")
    List<Appointment> findTodayAppointmentsByDoctor(
        String tenantId, String doctorId, LocalDateTime startOfDay, LocalDateTime endOfDay);
    
    // Find upcoming appointments (for reminders)
    @Query("{'tenantId': ?0, 'appointmentDateTime': {$gte: ?1, $lte: ?2}, 'status': {$in: ['booked', 'confirmed']}}")
    List<Appointment> findUpcomingAppointments(
        String tenantId, LocalDateTime startTime, LocalDateTime endTime);
    
    // Find recurring appointments
    List<Appointment> findByTenantIdAndParentAppointmentId(String tenantId, String parentAppointmentId);
    
    // Find appointments by appointment type
    List<Appointment> findByTenantIdAndAppointmentType(String tenantId, String appointmentType);
    
    // Count appointments by doctor and date
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'appointmentDateTime': {$gte: ?2, $lt: ?3}}", count = true)
    long countByTenantIdAndDoctorIdAndDate(
        String tenantId, String doctorId, LocalDateTime startOfDay, LocalDateTime endOfDay);
    
    // Find overdue appointments (no-show candidates)
    @Query("{'tenantId': ?0, 'appointmentDateTime': {$lt: ?1}, 'status': {$in: ['booked', 'confirmed']}}")
    List<Appointment> findOverdueAppointments(String tenantId, LocalDateTime cutoffTime);
    
    // Complex search with multiple filters
    @Query("{'tenantId': ?0, " +
           "$and': [" +
           "{'$or': [{'doctorId': {$regex: ?1, $options: 'i'}}, {'patientId': {$regex: ?1, $options: 'i'}}]}, " +
           "{'appointmentDateTime': {$gte: ?2, $lte: ?3}}, " +
           "{'status': {$in: ?4}}" +
           "]}")
    Page<Appointment> searchAppointments(
        String tenantId, String searchTerm, LocalDateTime startDate, 
        LocalDateTime endDate, List<String> statuses, Pageable pageable);
}