package com.maxchauo.skillswapz.service.utils;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ObjectMetadata;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Component
public class S3Util {

    private final AmazonS3 s3Client;
    private final String bucketName = System.getenv("S3_BUCKET_NAME");

    public S3Util() {
        this.s3Client = AmazonS3ClientBuilder.defaultClient();
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());

        s3Client.putObject(bucketName, fileName, file.getInputStream(), metadata);

        return s3Client.getUrl(bucketName, fileName).toString();
    }
}