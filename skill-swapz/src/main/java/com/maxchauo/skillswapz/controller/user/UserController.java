package com.maxchauo.skillswapz.controller.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.service.user.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/1.0/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public UserDto getUserProfile(@RequestParam("userId") Integer userId) {
        return userService.getUserProfile(userId);
    }

    @PatchMapping("/profile")
    public UserDto updateUserProfile(@RequestBody UserDto userDto) throws IOException {
        return userService.updateUserProfile(userDto);
    }

    @PatchMapping("/upload-avatar")
    public ResponseEntity<UserDto> uploadAvatar(
            @RequestParam("userId") Integer userId,
            @RequestPart("avatar") MultipartFile avatar) {
        try {
            if (avatar.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(null);
            }

            String contentType = avatar.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(null);
            }

            UserDto updatedUser = userService.uploadUserAvatar(userId, avatar);
            return ResponseEntity.ok(updatedUser);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/avatar")
    public ResponseEntity<String> getUserAvatar(@RequestParam("userId") Integer userId) {
        try {
            String avatarUrl = userService.getUserAvatar(userId);
            if (avatarUrl != null) {
                return ResponseEntity.ok(avatarUrl);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Avatar not found");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
