package com.maxchauo.skillswapz.service.utils;

import com.amazonaws.AmazonServiceException;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ObjectMetadata;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.util.UUID;

@Component
public class S3Util {

    private  AmazonS3 s3Client;

    @Value("${S3_BUCKET_NAME}")
    private String bucketName;

    @Value("${cloud.aws.region.static}")
    private String region;

    @PostConstruct
    public void init() {
        System.out.println("S3 Bucket Name: " + bucketName);
        System.out.println("S3 Region: " + region);

        this.s3Client = AmazonS3ClientBuilder.standard()
                .withRegion(region)
                .build();
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());

        try {
            s3Client.putObject(bucketName, fileName, file.getInputStream(), metadata);
            return s3Client.getUrl(bucketName, fileName).toString();
        } catch (AmazonServiceException e) {
            System.err.println("Amazon S3 upload failed: " + e.getErrorMessage());
            throw new IOException("Failed to upload file to S3", e);
        }
    }

    public void deleteFile(String fileUrl) {
        if (bucketName == null || bucketName.isEmpty()) {
            System.err.println("Bucket name is not specified. Please check S3_BUCKET_NAME environment variable.");
            return;
        }

        try {
            URL url = new URL(fileUrl);
            String key = url.getPath().substring(1);
            s3Client.deleteObject(bucketName, key);
            System.out.println("File deleted successfully from S3: " + key);
        } catch (Exception e) {
            System.err.println("Failed to delete file from S3: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
