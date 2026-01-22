package com.dentamate.appointments.repository;

import com.dentamate.appointments.model.DoctorSchedule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorScheduleRepository extends MongoRepository<DoctorSchedule, String> {
    
    // Find schedule by doctor and date
    Optional<DoctorSchedule> findByTenantIdAndDoctorIdAndDate(String tenantId, String doctorId, LocalDate date);
    
    // Find schedules by doctor and date range
    List<DoctorSchedule> findByTenantIdAndDoctorIdAndDateBetween(
        String tenantId, String doctorId, LocalDate startDate, LocalDate endDate);
    
    // Find schedules by clinic and date
    List<DoctorSchedule> findByTenantIdAndClinicIdAndDate(String tenantId, String clinicId, LocalDate date);
    
    // Find schedules by clinic and date range
    List<DoctorSchedule> findByTenantIdAndClinicIdAndDateBetween(
        String tenantId, String clinicId, LocalDate startDate, LocalDate endDate);
    
    // Find available doctors for a date
    @Query("{'tenantId': ?0, 'date': ?1, 'isAvailable': true}")
    List<DoctorSchedule> findAvailableDoctorsByDate(String tenantId, LocalDate date);
    
    // Find available doctors for a clinic and date
    @Query("{'tenantId': ?0, 'clinicId': ?1, 'date': ?2, 'isAvailable': true}")
    List<DoctorSchedule> findAvailableDoctorsByClinicAndDate(
        String tenantId, String clinicId, LocalDate date);
    
    // Find schedules by branch
    List<DoctorSchedule> findByTenantIdAndBranchIdAndDate(String tenantId, String branchId, LocalDate date);
    
    // Find schedules by department
    List<DoctorSchedule> findByTenantIdAndDepartmentIdAndDate(String tenantId, String departmentId, LocalDate date);
    
    // Find unavailable doctors (for reporting)
    @Query("{'tenantId': ?0, 'date': ?1, 'isAvailable': false}")
    List<DoctorSchedule> findUnavailableDoctorsByDate(String tenantId, LocalDate date);
    
    // Find schedules with specific availability status
    List<DoctorSchedule> findByTenantIdAndDateAndIsAvailable(
        String tenantId, LocalDate date, Boolean isAvailable);
    
    // Find schedules that need cleanup (old dates)
    @Query("{'tenantId': ?0, 'date': {$lt: ?1}}")
    List<DoctorSchedule> findOldSchedules(String tenantId, LocalDate cutoffDate);
    
    // Find schedules by doctor for multiple dates
    @Query("{'tenantId': ?0, 'doctorId': ?1, 'date': {$in: ?2}}")
    List<DoctorSchedule> findByTenantIdAndDoctorIdAndDateIn(
        String tenantId, String doctorId, List<LocalDate> dates);
    
    // Check if doctor is available on date
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'isAvailable': true}", exists = true)
    boolean existsByTenantIdAndDoctorIdAndDateAndIsAvailable(
        String tenantId, String doctorId, LocalDate date);
    
    // Find schedules with emergency slots available
    @Query("{'tenantId': ?0, 'date': ?1, 'isAvailable': true, 'emergencySlots': {$gt: 0}}")
    List<DoctorSchedule> findSchedulesWithEmergencySlots(String tenantId, LocalDate date);
}