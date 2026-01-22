package com.dentamate.appointments.controller;

import com.dentamate.appointments.model.Token;
import com.dentamate.appointments.model.TokenStatus;
import com.dentamate.appointments.service.TokenService;
import com.dentamate.appointments.exception.TokenException;
import com.dentamate.appointments.exception.ValidationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/tokens")
@CrossOrigin(origins = "*")
public class TokenController {

    @Autowired
    private TokenService tokenService;

    /**
     * Get current token being served by doctor
     */
    @GetMapping("/doctor/{doctorId}/current")
    public ResponseEntity<Token> getCurrentToken(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            Optional<Token> currentToken = tokenService.getCurrentToken(tenantId, doctorId, queryDate);
            
            return currentToken.map(ResponseEntity::ok)
                             .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get next token to be called
     */
    @GetMapping("/doctor/{doctorId}/next")
    public ResponseEntity<Token> getNextToken(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            Optional<Token> nextToken = tokenService.getNextToken(tenantId, doctorId, queryDate);
            
            return nextToken.map(ResponseEntity::ok)
                           .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Call next token
     */
    @PostMapping("/doctor/{doctorId}/call-next")
    public ResponseEntity<Token> callNextToken(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            Token token = tokenService.callNextToken(tenantId, doctorId, queryDate, userId);
            return ResponseEntity.ok(token);
        } catch (TokenException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update token status
     */
    @PutMapping("/{tokenId}/status")
    public ResponseEntity<Token> updateTokenStatus(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String tokenId,
            @RequestBody Map<String, String> statusUpdate) {
        
        try {
            String statusValue = statusUpdate.get("status");
            TokenStatus newStatus = TokenStatus.fromValue(statusValue);
            
            Token token = tokenService.updateTokenStatus(tenantId, tokenId, newStatus, userId);
            return ResponseEntity.ok(token);
        } catch (TokenException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Skip token
     */
    @PostMapping("/{tokenId}/skip")
    public ResponseEntity<Token> skipToken(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String tokenId) {
        
        try {
            Token token = tokenService.skipToken(tenantId, tokenId, userId);
            return ResponseEntity.ok(token);
        } catch (TokenException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Cancel token
     */
    @DeleteMapping("/{tokenId}")
    public ResponseEntity<Token> cancelToken(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String tokenId) {
        
        try {
            Token token = tokenService.cancelToken(tenantId, tokenId, userId);
            return ResponseEntity.ok(token);
        } catch (TokenException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get waiting tokens for doctor in order
     */
    @GetMapping("/doctor/{doctorId}/waiting")
    public ResponseEntity<List<Token>> getWaitingTokens(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            List<Token> tokens = tokenService.getWaitingTokens(tenantId, doctorId, queryDate);
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all tokens for doctor on date
     */
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Token>> getTokensByDoctorAndDate(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            List<Token> tokens = tokenService.getTokensByDoctorAndDate(tenantId, doctorId, queryDate);
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get tokens by status
     */
    @GetMapping("/doctor/{doctorId}/status/{status}")
    public ResponseEntity<List<Token>> getTokensByStatus(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @PathVariable String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            TokenStatus tokenStatus = TokenStatus.fromValue(status);
            
            List<Token> tokens = tokenService.getTokensByStatus(tenantId, doctorId, queryDate, tokenStatus);
            return ResponseEntity.ok(tokens);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get token count by status
     */
    @GetMapping("/doctor/{doctorId}/count/{status}")
    public ResponseEntity<Map<String, Object>> getTokenCountByStatus(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @PathVariable String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            TokenStatus tokenStatus = TokenStatus.fromValue(status);
            
            long count = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, tokenStatus);
            
            return ResponseEntity.ok(Map.of(
                "doctorId", doctorId,
                "date", queryDate.toString(),
                "status", status,
                "count", count
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get walk-in tokens
     */
    @GetMapping("/doctor/{doctorId}/walk-in")
    public ResponseEntity<List<Token>> getWalkInTokens(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            List<Token> tokens = tokenService.getWalkInTokens(tenantId, doctorId, queryDate);
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Reorder tokens (admin override)
     */
    @PostMapping("/doctor/{doctorId}/reorder")
    public ResponseEntity<Map<String, String>> reorderTokens(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestHeader("X-User-ID") String userId,
            @PathVariable String doctorId,
            @RequestBody Map<String, Object> reorderRequest) {
        
        try {
            LocalDate date = LocalDate.parse((String) reorderRequest.get("date"));
            @SuppressWarnings("unchecked")
            List<String> tokenIds = (List<String>) reorderRequest.get("tokenIds");
            
            tokenService.reorderTokens(tenantId, doctorId, date, tokenIds, userId);
            
            return ResponseEntity.ok(Map.of(
                "message", "Tokens reordered successfully",
                "doctorId", doctorId,
                "date", date.toString()
            ));
        } catch (TokenException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get queue summary for doctor
     */
    @GetMapping("/doctor/{doctorId}/queue-summary")
    public ResponseEntity<Map<String, Object>> getQueueSummary(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            
            long waitingCount = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, TokenStatus.WAITING);
            long inProgressCount = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, TokenStatus.IN_PROGRESS);
            long completedCount = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, TokenStatus.COMPLETED);
            long skippedCount = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, TokenStatus.SKIPPED);
            long cancelledCount = tokenService.getTokenCountByStatus(tenantId, doctorId, queryDate, TokenStatus.CANCELLED);
            
            Optional<Token> currentToken = tokenService.getCurrentToken(tenantId, doctorId, queryDate);
            Optional<Token> nextToken = tokenService.getNextToken(tenantId, doctorId, queryDate);
            
            return ResponseEntity.ok(Map.of(
                "doctorId", doctorId,
                "date", queryDate.toString(),
                "waiting", waitingCount,
                "inProgress", inProgressCount,
                "completed", completedCount,
                "skipped", skippedCount,
                "cancelled", cancelledCount,
                "total", waitingCount + inProgressCount + completedCount + skippedCount + cancelledCount,
                "currentToken", currentToken.map(Token::getTokenNumber).orElse(null),
                "nextToken", nextToken.map(Token::getTokenNumber).orElse(null)
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
            "service", "token-service",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}