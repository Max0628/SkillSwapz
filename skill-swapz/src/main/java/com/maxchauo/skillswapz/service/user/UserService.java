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
    private final AuthRepository authRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;

    public UserService(AuthRepository authRepo, UserRepository userRepo, PasswordEncoder passwordEncoder, JwtTokenUtil jwtTokenUtil) {
        this.authRepo = authRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenUtil = jwtTokenUtil;
    }


    public boolean registerUser(UserDto userDto) {
        if (authRepo.getUserByEmail(userDto.getEmail()) != null) {
            return false;
        }
        userDto.setPassword(passwordEncoder.encode(userDto.getPassword()));
        authRepo.saveUser(userDto);
        return true;
    }

    public String loginUser(String email, String password) {
        UserDto user = authRepo.getUserByEmail(email);
        if (user == null) {
            return null;
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
