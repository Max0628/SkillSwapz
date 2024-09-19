package com.maxchauo.skillswapz.service.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.data.form.user.User;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;
import com.maxchauo.skillswapz.repository.auth.AuthRepository;
import com.maxchauo.skillswapz.repository.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    @Autowired
    private AuthRepository authRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;



    public String registerUser(UserDto userDto) {
        if (authRepo.getUserByEmail(userDto.getEmail()) != null) {
            return "該 Email 已經被使用";
        }
        userDto.setPassword(passwordEncoder.encode(userDto.getPassword()));
        authRepo.saveUser(userDto);
        return "用戶註冊成功";
    }

    public String loginUser(String email, String password) {
        UserDto user = authRepo.getUserByEmail(email);
        if (user == null) {
            return "該用戶不存在";
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return "密碼錯誤";
        }

        // 如果密碼正確，生成 JWT Token 並返回
        return jwtTokenUtil.generateToken(user.getEmail(), user.getId().toString());
    }

    public UserDto getUserById(Integer id) {
        return authRepo.getUserById(id);
    }

    public User getUserProfile(Integer userId) {
        return userRepo.findById(userId);
    }

    public void updateUserProfile(Integer userId, String jobTitle, String bio) {
        User user = userRepo.findById(userId);
        user.setJobTitle(jobTitle);
        user.setBio(bio);
        userRepo.updateProfile(user);
    }
}