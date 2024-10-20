package com.maxchauo.skillswapz.middleware;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maxchauo.skillswapz.repository.auth.AuthRepository;

import io.micrometer.common.lang.NonNull;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenFilter extends OncePerRequestFilter {

    private final AuthRepository authRepository;
    private final JwtTokenUtil jwtTokenUtil;
    private final ObjectMapper jsonObjectMapper = new ObjectMapper();
    public static final Logger logger = LoggerFactory.getLogger(JwtTokenFilter.class);

    public JwtTokenFilter(AuthRepository authRepository, JwtTokenUtil jwtTokenUtil) {
        this.authRepository = authRepository;
        this.jwtTokenUtil = jwtTokenUtil;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws IOException {
        try {
            final String token = retrieveToken(request);
            if (token == null || !jwtTokenUtil.validate(token)) {
                chain.doFilter(request, response);
                return;
            }

            UserDetails userDetails = authRepository.getUserDetailsByToken(token);

            UsernamePasswordAuthenticationToken authAfterSuccessLogin =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            authAfterSuccessLogin.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authAfterSuccessLogin);
            logger.debug("Token verify OK: {}", userDetails.getUsername());

            chain.doFilter(request, response);
        } catch (Exception e) {
            Map<String, String> errorMsg = new HashMap<>();
            errorMsg.put("error", e.getMessage());
            handleException(response, HttpStatus.UNAUTHORIZED.value(), errorMsg);
        }
    }

    private String retrieveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private void handleException(HttpServletResponse response, int status, Map<String, String> errorMsg) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        jsonObjectMapper.writeValue(response.getWriter(), errorMsg);
    }
}

