package com.dentamate.appointments.repository;

import com.dentamate.appointments.model.Token;
import com.dentamate.appointments.model.TokenStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TokenRepository extends MongoRepository<Token, String> {
    
    // Find tokens by tenant
    List<Token> findByTenantId(String tenantId);
    
    // Find tokens by appointment
    Optional<Token> findByTenantIdAndAppointmentId(String tenantId, String appointmentId);
    
    // Find tokens by doctor and date
    List<Token> findByTenantIdAndDoctorIdAndDate(String tenantId, String doctorId, LocalDate date);
    
    // Find tokens by doctor, date and status
    List<Token> findByTenantIdAndDoctorIdAndDateAndStatus(
        String tenantId, String doctorId, LocalDate date, TokenStatus status);
    
    // Find tokens by clinic and date
    List<Token> findByTenantIdAndClinicIdAndDate(String tenantId, String clinicId, LocalDate date);
    
    // Find tokens by patient
    List<Token> findByTenantIdAndPatientId(String tenantId, String patientId);
    
    // Find next token number for doctor on date
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2}", 
           sort = "{'tokenNumber': -1}")
    Optional<Token> findTopByTenantIdAndDoctorIdAndDateOrderByTokenNumberDesc(
        String tenantId, String doctorId, LocalDate date);
    
    // Find current token being served
    @Query("{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'status': 'IN_PROGRESS'}")
    Optional<Token> findCurrentToken(String tenantId, String doctorId, LocalDate date);
    
    // Find waiting tokens in order
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'status': 'WAITING'}", 
           sort = "{'priority': -1, 'tokenNumber': 1}")
    List<Token> findWaitingTokensInOrder(String tenantId, String doctorId, LocalDate date);
    
    // Find next token to be called
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'status': 'WAITING'}", 
           sort = "{'priority': -1, 'tokenNumber': 1}")
    Optional<Token> findNextTokenToCall(String tenantId, String doctorId, LocalDate date);
    
    // Count tokens by status
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'status': ?3}", count = true)
    long countByTenantIdAndDoctorIdAndDateAndStatus(
        String tenantId, String doctorId, LocalDate date, TokenStatus status);
    
    // Find tokens by status for a clinic
    List<Token> findByTenantIdAndClinicIdAndDateAndStatus(
        String tenantId, String clinicId, LocalDate date, TokenStatus status);
    
    // Find walk-in tokens
    List<Token> findByTenantIdAndDoctorIdAndDateAndIsWalkIn(
        String tenantId, String doctorId, LocalDate date, Boolean isWalkIn);
    
    // Find tokens with estimated wait time calculation
    @Query(value = "{'tenantId': ?0, 'doctorId': ?1, 'date': ?2, 'tokenNumber': {$lte: ?3}, 'status': {$in: ['WAITING', 'IN_PROGRESS']}}")
    List<Token> findTokensBeforeNumber(String tenantId, String doctorId, LocalDate date, Integer tokenNumber);
    
    // Find overdue tokens (for cleanup)
    @Query("{'tenantId': ?0, 'date': {$lt: ?1}, 'status': {$in: ['WAITING', 'IN_PROGRESS']}}")
    List<Token> findOverdueTokens(String tenantId, LocalDate cutoffDate);
    
    // Find tokens by branch
    List<Token> findByTenantIdAndBranchIdAndDate(String tenantId, String branchId, LocalDate date);
    
    // Find tokens by department
    List<Token> findByTenantIdAndDepartmentIdAndDate(String tenantId, String departmentId, LocalDate date);
}