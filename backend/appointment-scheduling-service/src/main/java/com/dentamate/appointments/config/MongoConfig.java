package com.dentamate.appointments.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;

@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Override
    protected String getDatabaseName() {
        return "dentamate_appointments";
    }

    // Additional MongoDB configuration can be added here
    // For example, custom converters, connection settings, etc.
}