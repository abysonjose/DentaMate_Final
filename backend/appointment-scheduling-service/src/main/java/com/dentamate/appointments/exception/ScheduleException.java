package com.dentamate.appointments.exception;

public class ScheduleException extends RuntimeException {
    
    public ScheduleException(String message) {
        super(message);
    }
    
    public ScheduleException(String message, Throwable cause) {
        super(message, cause);
    }
}