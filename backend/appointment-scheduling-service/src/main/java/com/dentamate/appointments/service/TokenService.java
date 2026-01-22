package com.dentamate.appointments.service;

import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.Token;
import com.dentamate.appointments.model.TokenStatus;
import com.dentamate.appointments.repository.TokenRepository;
import com.dentamate.appointments.exception.TokenException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TokenService {

    @Autowired
    private TokenRepository tokenRepository;

    /**
     * Generate token for appointment
     */
    public Token generateToken(String tenantId, Appointment appointment) {
        LocalDate appointmentDate = appointment.getAppointmentDateTime().toLocalDate();
        
        // Get next token number for the doctor on this date
        Integer nextTokenNumber = getNextTokenNumber(tenantId, appointment.getDoctorId(), appointmentDate);
        
        // Create token
        Token token = new Token(
            tenantId,
            appointment.getId(),
            appointment.getPatientId(),
            appointment.getDoctorId(),
            appointment.getClinicId(),
            appointmentDate,
            nextTokenNumber
        );
        
        token.setBranchId(appointment.getBranchId());
        token.setDepartmentId(appointment.getDepartmentId());
        token.setCreatedBy(appointment.getCreatedBy());
        
        // Set priority for walk-ins or emergency appointments
        if ("emergency".equals(appointment.getAppointmentType())) {
            token.setPriority(10); // High priority
        } else if ("walk_in".equals(appointment.getAppointmentType())) {
            token.setIsWalkIn(true);
            token.setPriority(5); // Medium priority
        }
        
        // Calculate estimated wait time
        token.setEstimatedWaitTime(calculateEstimatedWaitTime(tenantId, appointment.getDoctorId(), 
                                                            appointmentDate, nextTokenNumber));
        
        return tokenRepository.save(token);
    }

    /**
     * Update token status
     */
    public Token updateTokenStatus(String tenantId, String tokenId, TokenStatus newStatus, String updatedBy) {
        Token token = tokenRepository.findById(tokenId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new TokenException("Token not found"));

        TokenStatus oldStatus = token.getStatus();
        token.setStatus(newStatus);
        token.setUpdatedBy(updatedBy);

        // Update timestamps based on status
        LocalDateTime now = LocalDateTime.now();
        switch (newStatus) {
            case WAITING -> {
                if (token.getCheckedInAt() == null) {
                    token.setCheckedInAt(now);
                }
            }
            case IN_PROGRESS -> {
                token.setCalledAt(now);
                token.setConsultationStartedAt(now);
            }
            case COMPLETED -> {
                token.setConsultationEndedAt(now);
            }
        }

        token = tokenRepository.save(token);

        // Update wait times for other tokens if this token status changed
        if (newStatus == TokenStatus.COMPLETED || newStatus == TokenStatus.CANCELLED) {
            updateWaitTimesForDoctor(tenantId, token.getDoctorId(), token.getDate());
        }

        return token;
    }

    /**
     * Get current token being served by doctor
     */
    public Optional<Token> getCurrentToken(String tenantId, String doctorId, LocalDate date) {
        return tokenRepository.findCurrentToken(tenantId, doctorId, date);
    }

    /**
     * Get next token to be called
     */
    public Optional<Token> getNextToken(String tenantId, String doctorId, LocalDate date) {
        return tokenRepository.findNextTokenToCall(tenantId, doctorId, date);
    }

    /**
     * Call next token
     */
    public Token callNextToken(String tenantId, String doctorId, LocalDate date, String calledBy) {
        // Complete current token if exists
        getCurrentToken(tenantId, doctorId, date)
            .ifPresent(currentToken -> {
                updateTokenStatus(tenantId, currentToken.getId(), TokenStatus.COMPLETED, calledBy);
            });

        // Get next token
        Token nextToken = getNextToken(tenantId, doctorId, date)
            .orElseThrow(() -> new TokenException("No tokens waiting"));

        // Update status to IN_PROGRESS
        return updateTokenStatus(tenantId, nextToken.getId(), TokenStatus.IN_PROGRESS, calledBy);
    }

    /**
     * Skip token
     */
    public Token skipToken(String tenantId, String tokenId, String skippedBy) {
        return updateTokenStatus(tenantId, tokenId, TokenStatus.SKIPPED, skippedBy);
    }

    /**
     * Cancel token
     */
    public Token cancelToken(String tenantId, String tokenId, String cancelledBy) {
        Token token = updateTokenStatus(tenantId, tokenId, TokenStatus.CANCELLED, cancelledBy);
        
        // Update wait times for remaining tokens
        updateWaitTimesForDoctor(tenantId, token.getDoctorId(), token.getDate());
        
        return token;
    }

    /**
     * Reschedule token to new date
     */
    public Token rescheduleToken(String tenantId, String tokenId, LocalDate newDate) {
        Token token = tokenRepository.findById(tokenId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new TokenException("Token not found"));

        // Cancel old token
        token.setStatus(TokenStatus.CANCELLED);
        tokenRepository.save(token);

        // Create new token for new date
        Integer newTokenNumber = getNextTokenNumber(tenantId, token.getDoctorId(), newDate);
        
        Token newToken = new Token(
            tenantId,
            token.getAppointmentId(),
            token.getPatientId(),
            token.getDoctorId(),
            token.getClinicId(),
            newDate,
            newTokenNumber
        );
        
        newToken.setBranchId(token.getBranchId());
        newToken.setDepartmentId(token.getDepartmentId());
        newToken.setIsWalkIn(token.getIsWalkIn());
        newToken.setPriority(token.getPriority());
        newToken.setCreatedBy(token.getCreatedBy());
        newToken.setEstimatedWaitTime(calculateEstimatedWaitTime(tenantId, token.getDoctorId(), 
                                                               newDate, newTokenNumber));

        return tokenRepository.save(newToken);
    }

    /**
     * Get waiting tokens for doctor in order
     */
    public List<Token> getWaitingTokens(String tenantId, String doctorId, LocalDate date) {
        return tokenRepository.findWaitingTokensInOrder(tenantId, doctorId, date);
    }

    /**
     * Get all tokens for doctor on date
     */
    public List<Token> getTokensByDoctorAndDate(String tenantId, String doctorId, LocalDate date) {
        return tokenRepository.findByTenantIdAndDoctorIdAndDate(tenantId, doctorId, date);
    }

    /**
     * Get tokens by status
     */
    public List<Token> getTokensByStatus(String tenantId, String doctorId, LocalDate date, TokenStatus status) {
        return tokenRepository.findByTenantIdAndDoctorIdAndDateAndStatus(tenantId, doctorId, date, status);
    }

    /**
     * Get token count by status
     */
    public long getTokenCountByStatus(String tenantId, String doctorId, LocalDate date, TokenStatus status) {
        return tokenRepository.countByTenantIdAndDoctorIdAndDateAndStatus(tenantId, doctorId, date, status);
    }

    /**
     * Get walk-in tokens
     */
    public List<Token> getWalkInTokens(String tenantId, String doctorId, LocalDate date) {
        return tokenRepository.findByTenantIdAndDoctorIdAndDateAndIsWalkIn(tenantId, doctorId, date, true);
    }

    /**
     * Reorder tokens (admin override)
     */
    public void reorderTokens(String tenantId, String doctorId, LocalDate date, List<String> tokenIds, String reorderedBy) {
        List<Token> tokens = tokenRepository.findAllById(tokenIds);
        
        // Validate all tokens belong to the same doctor and date
        boolean valid = tokens.stream()
            .allMatch(token -> token.getTenantId().equals(tenantId) && 
                             token.getDoctorId().equals(doctorId) && 
                             token.getDate().equals(date));
        
        if (!valid) {
            throw new TokenException("Invalid tokens for reordering");
        }

        // Update token numbers based on new order
        for (int i = 0; i < tokens.size(); i++) {
            Token token = tokens.get(i);
            token.setTokenNumber(i + 1);
            token.setUpdatedBy(reorderedBy);
            token.setEstimatedWaitTime(calculateEstimatedWaitTime(tenantId, doctorId, date, i + 1));
        }

        tokenRepository.saveAll(tokens);
    }

    // Private helper methods

    private Integer getNextTokenNumber(String tenantId, String doctorId, LocalDate date) {
        Optional<Token> lastToken = tokenRepository
            .findTopByTenantIdAndDoctorIdAndDateOrderByTokenNumberDesc(tenantId, doctorId, date);
        
        return lastToken.map(token -> token.getTokenNumber() + 1).orElse(1);
    }

    private Integer calculateEstimatedWaitTime(String tenantId, String doctorId, LocalDate date, Integer tokenNumber) {
        // Get tokens before this token number that are still waiting or in progress
        List<Token> tokensAhead = tokenRepository
            .findTokensBeforeNumber(tenantId, doctorId, date, tokenNumber);
        
        // Assume average consultation time of 30 minutes
        int averageConsultationTime = 30;
        
        // Calculate wait time based on tokens ahead
        return tokensAhead.size() * averageConsultationTime;
    }

    private void updateWaitTimesForDoctor(String tenantId, String doctorId, LocalDate date) {
        List<Token> waitingTokens = getWaitingTokens(tenantId, doctorId, date);
        
        for (int i = 0; i < waitingTokens.size(); i++) {
            Token token = waitingTokens.get(i);
            token.setEstimatedWaitTime(i * 30); // 30 minutes per token ahead
            tokenRepository.save(token);
        }
    }
}