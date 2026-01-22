package com.dentamate.appointments.model;

public enum TokenStatus {
    WAITING("waiting"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    SKIPPED("skipped"),
    CANCELLED("cancelled");

    private final String value;

    TokenStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TokenStatus fromValue(String value) {
        for (TokenStatus status : TokenStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid token status: " + value);
    }
}