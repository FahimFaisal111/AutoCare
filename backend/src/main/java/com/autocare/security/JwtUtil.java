package com.autocare.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Generates a signed JWT containing user identity and tenant context claims.
     */
    public String generateToken(UserPrincipal principal) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", principal.getUserId());
        claims.put("workshopId", principal.getWorkshopId());
        claims.put("role", principal.getRole().name());

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
            .claims(claims)
            .subject(principal.getEmail())
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key)
            .compact();
    }

    public String getEmailFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public Integer getUserIdFromToken(String token) {
        return getClaims(token).get("userId", Integer.class);
    }

    public Integer getWorkshopIdFromToken(String token) {
        return getClaims(token).get("workshopId", Integer.class);
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Generates a short-lived (15 minutes) cryptographically signed password reset token.
     */
    public String generatePasswordResetToken(String email) {
        Date now = new Date();
        long resetExpiryMs = 15 * 60 * 1000L; // 15 minutes
        Date expiryDate = new Date(now.getTime() + resetExpiryMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("purpose", "PASSWORD_RESET");

        return Jwts.builder()
            .claims(claims)
            .subject(email)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key)
            .compact();
    }

    public boolean validatePasswordResetToken(String token) {
        try {
            Claims claims = getClaims(token);
            return "PASSWORD_RESET".equals(claims.get("purpose", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getEmailFromResetToken(String token) {
        return getClaims(token).getSubject();
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}

