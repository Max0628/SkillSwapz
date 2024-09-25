package com.maxchauo.skillswapz.service.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.data.form.user.User;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;
import com.maxchauo.skillswapz.repository.auth.AuthRepository;
import com.maxchauo.skillswapz.repository.user.UserRepository;
import com.maxchauo.skillswapz.service.utils.S3Util;
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

    public UserDto updateUserProfile(UserDto userDto) throws IOException {
        UserDto user = userRepo.findById(userDto.getId());

        if (userDto.getUsername() != null) {
            user.setUsername(userDto.getUsername());
        }

        if (userDto.getJobTitle() != null) {
            user.setJobTitle(userDto.getJobTitle());
        }

        if (userDto.getBio() != null) {
            user.setBio(userDto.getBio());
        }

        userRepo.updateProfile(user);
        return convertToDto(user);
    }

    private UserDto convertToDto(UserDto user) {
        System.out.println(user);
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .jobTitle(user.getJobTitle())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    public UserDto uploadUserAvatar(Integer userId, MultipartFile avatar) throws IOException {
        UserDto user = getUserProfile(userId);

        // 刪除舊的頭像文件
        if (user.getAvatarUrl() != null) {
            s3Util.deleteFile(user.getAvatarUrl());
        }

        // 上傳新的頭像文件
        String avatarUrl = s3Util.uploadFile(avatar);

        // 更新資料庫
        userRepo.updateAvatarUrl(userId, avatarUrl);

        // 返回更新後的用戶資料
        return getUserProfile(userId);
    }

    public String getUserAvatar(Integer userId) {
        // 從資料庫中獲取用戶的頭像 URL
        UserDto user = userRepo.findById(userId);
        return user.getAvatarUrl(); // 返回頭像的 URL
    }
}
