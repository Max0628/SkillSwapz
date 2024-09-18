package com.maxchauo.skillswapz.controller.user;

import com.maxchauo.skillswapz.data.form.user.User;
import com.maxchauo.skillswapz.service.user.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/1.0/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public User getUserProfile(@RequestAttribute("userId") Integer userId) {
        return userService.getUserProfile(userId);
    }

    @PutMapping("/profile")
    public void updateUserProfile(
            @RequestAttribute("userId") Integer userId,
            @RequestParam("job_title") String jobTitle,
            @RequestParam("bio") String bio)
//            @RequestParam(value = "avatar", required = false) MultipartFile avatar)
    {
//        userService.updateUserProfile(userId, jobTitle, bio, avatar);
        userService.updateUserProfile(userId, jobTitle, bio);
    }
}
