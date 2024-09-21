package com.maxchauo.skillswapz.controller.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.data.form.user.User;
import com.maxchauo.skillswapz.service.user.UserService;
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
    public UserDto getUserProfile(@RequestAttribute("userId") Integer userId) {
        return userService.getUserProfile(userId);
    }

    @PatchMapping("/profile")
    public UserDto updateUserProfile(
            @RequestAttribute("userId") Integer userId,
            @RequestParam(value = "job_title", required = false) String jobTitle,
            @RequestParam(value = "bio", required = false) String bio,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar
    ) throws IOException {
        return userService.updateUserProfile(userId, jobTitle, bio, avatar);
    }
}
