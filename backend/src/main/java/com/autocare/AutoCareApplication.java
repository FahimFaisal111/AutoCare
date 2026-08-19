package com.autocare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class AutoCareApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(AutoCareApplication.class, args);
    }

    /**
     * Reads .env file into Java System Properties before Spring initializes
     * DataSource.
     */
    private static void loadDotEnv() {
        File envFile = new File(".env");
        if (envFile.exists()) {
            try {
                List<String> lines = Files.readAllLines(envFile.toPath());
                for (String line : lines) {
                    line = line.trim();
                    if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
                        int eqIdx = line.indexOf('=');
                        String key = line.substring(0, eqIdx).trim();
                        String value = line.substring(eqIdx + 1).trim();
                        if (System.getProperty(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                }
            } catch (IOException e) {
                System.err.println("Notice: Could not load .env file: " + e.getMessage());
            }
        }
    }
}
