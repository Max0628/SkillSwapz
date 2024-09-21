package com.maxchauo.skillswapz.service.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.data.form.user.User;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;
import com.maxchauo.skillswapz.repository.auth.AuthRepository;
import com.maxchauo.skillswapz.repository.user.UserRepository;
import com.maxchauo.skillswapz.service.utils.S3Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class UserService {
    private final AuthRepository authRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final S3Util s3Util;
    public UserService(AuthRepository authRepo, UserRepository userRepo, PasswordEncoder passwordEncoder, JwtTokenUtil jwtTokenUtil, S3Util s3Util) {
        this.authRepo = authRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenUtil = jwtTokenUtil;
        this.s3Util = s3Util;
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

    public UserDto getUserProfile(Integer userId) {
        return userRepo.findById(userId);
    }

    public UserDto updateUserProfile(Integer userId, String jobTitle, String bio, MultipartFile avatar) throws IOException {
        UserDto user = userRepo.findById(userId);

        if (jobTitle != null) {
            user.setJob_title(jobTitle);
        }
        if (bio != null) {
            user.setBio(bio);
        }
        if (avatar != null && !avatar.isEmpty()) {
            String avatarUrl = s3Util.uploadFile(avatar);
            user.setAvatar_url(avatarUrl);
        }

        userRepo.updateProfile(user);
        return convertToDto(user);
    }


    private UserDto convertToDto(UserDto userDto) {
        UserDto dto = new UserDto();
        dto.setId(userDto.getId());
        dto.setUsername(userDto.getUsername());
        dto.setEmail(userDto.getEmail());
        dto.setAvatar_url(userDto.getAvatar_url());
        dto.setJob_title(userDto.getJob_title());
        dto.setBio(userDto.getBio());
        return dto;
    }


}
