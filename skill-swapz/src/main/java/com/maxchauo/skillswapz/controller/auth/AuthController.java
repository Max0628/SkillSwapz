package com.maxchauo.skillswapz.controller.auth;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;
import com.maxchauo.skillswapz.service.user.UserService;

import io.jsonwebtoken.Claims;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("api/1.0/auth")
public class AuthController {
  private final UserService userService;
  private final JwtTokenUtil jwtTokenUtil;

  public AuthController(UserService userService, JwtTokenUtil jwtTokenUtil) {
    this.userService = userService;
    this.jwtTokenUtil = jwtTokenUtil;
  }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserDto userDto) {
        boolean result = userService.registerUser(userDto);
        if (result) {
            return ResponseEntity.ok(Map.of("message","用戶註冊成功"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message","用戶註冊失敗"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserDto loginRequest) {
        String token = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());

        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message","帳號或密碼錯誤"));
        }

        ResponseCookie jwtCookie = ResponseCookie.from("access_token", token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(24 * 60 * 60)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(Map.of("message", "登入成功"));
    }

    @PostMapping("/me")
    public ResponseEntity<Map<String, String>> getUserInfoFromToken(@CookieValue(value = "access_token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "缺少 access_token"));
        }

        Claims claims = jwtTokenUtil.safelyParseToken(token);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }

        String userId = claims.get("user_id", String.class);
        return ResponseEntity.ok(Map.of("user_id", userId));
    }
}
