# SkillSwapz
**Exchange skills and grow together**
[ https://skillswapz.com](https://skillswapz.com/)

## About
SkillSwapz is a platform designed to help you find learning partners or exchange skills. Inspired by the concept of [托特](https://thoth.tw/), it facilitates connections and skill-sharing.


## Built with
![](https://img.shields.io/badge/Spring%20Boot-6DB33F.svg?style=for-the-badge&logo=Spring-Boot&logoColor=white)
![](https://img.shields.io/badge/HTML5-E34F26.svg?style=for-the-badge&logo=HTML5&logoColor=white)
![](https://img.shields.io/badge/CSS3-1572B6.svg?style=for-the-badge&logo=CSS3&logoColor=white)
![](https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=for-the-badge&logo=JavaScript&logoColor=black)
![](https://img.shields.io/badge/MySQL-4479A1.svg?style=for-the-badge&logo=MySQL&logoColor=white)
![](https://img.shields.io/badge/Redis-FF4438.svg?style=for-the-badge&logo=Redis&logoColor=white)
![](https://img.shields.io/badge/NGINX-009639.svg?style=for-the-badge&logo=NGINX&logoColor=white)
![](https://img.shields.io/badge/Amazon%20EC2-FF9900.svg?style=for-the-badge&logo=Amazon-EC2&logoColor=white)
![](https://img.shields.io/badge/Amazon%20RDS-527FFF.svg?style=for-the-badge&logo=Amazon-RDS&logoColor=white)
![](https://img.shields.io/badge/Amazon%20ElastiCache-C925D1.svg?style=for-the-badge&logo=Amazon-ElastiCache&logoColor=white)
![](https://img.shields.io/badge/Amazon%20S3-569A31.svg?style=for-the-badge&logo=Amazon-S3&logoColor=white)
![]()

## Features
* Create posts to find learning partners (Skill Exchange, Find Tutor, Find Student, Start a Book Club).
* Real-time operations such as liking, bookmarking, commenting, editing, and deleting posts are enabled using WebSocket.
* Hottest tags will show on the right search sidebar.
* One-on-one private messaging is available.
* Unread message notifications appear next to the user avatar in the top right corner.
* "My Posts" section allows users to manage their posts.x
* "Bookmark" posts for easy access later.
* Users can update their profile or change their avatar by clicking on their profile.
* Use JWT to secure user account authentication.

## optimization
* Use Redis to cache the latest 30 posts, allowing users to load posts faster.
* Implement infinite scrolling for a smoother user experience while viewing posts.

## Architecture
![架構圖](https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/%E6%9E%B6%E6%A7%8B%E5%9C%96.jpg)

## Demo
[![](https://img.youtube.com/vi/UO7GLO4puak/maxresdefault.jpg)](https://youtu.be/UO7GLO4puak)

## Demo Accounts
| Name    | Email          | Password |
|---------|----------------|----------|
| 周杰倫   | jc@gmail.com   | pwd123   |
| 林志玲   | lcl@gmail.com  | pwd123   |

## Database Schema
### user
| Field      | Type         | Null | Key | Default           | Extra             |
|------------|--------------|------|-----|-------------------|-------------------|
| id         | int          | NO   | PRI | NULL              | auto_increment    |
| username   | varchar(255) | NO   | UNI | NULL              |                   |
| email      | varchar(255) | NO   | UNI | NULL              |                   |
| password   | varchar(255) | NO   |     | NULL              |                   |
| avatar_url | varchar(255) | YES  |     | NULL              |                   |
| job_title  | varchar(255) | YES  |     | NULL              |                   |
| bio        | text         | YES  |     | NULL              |                   |
| created_at | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### post
| Field             | Type         | Null | Key | Default           | Extra             |
|-------------------|--------------|------|-----|-------------------|-------------------|
| id                | int          | NO   | PRI | NULL              | auto_increment    |
| type              | varchar(50)  | NO   |     | NULL              |                   |
| user_id           | int          | NO   | MUL | NULL              |                   |
| location          | varchar(255) | NO   |     | NULL              |                   |
| skill_offered     | varchar(255) | YES  |     | NULL              |                   |
| skill_wanted      | varchar(255) | YES  |     | NULL              |                   |
| salary            | varchar(255) | YES  |     | NULL              |                   |
| like_count        | int          | YES  |     | 0                 |                   |
| book_club_purpose | varchar(255) | YES  |     | NULL              |                   |
| content           | text         | NO   |     | NULL              |                   |
| message_url       | varchar(255) | YES  |     | NULL              |                   |
| profile_url       | varchar(255) | YES  |     | NULL              |                   |
| post_url          | varchar(255) | YES  |     | NULL              |                   |
| tag               | varchar(255) | YES  |     | NULL              |                   |
| created_at        | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### chat_messages
| Field       | Type        | Null | Key | Default           | Extra             |
|-------------|-------------|------|-----|-------------------|-------------------|
| id          | bigint      | NO   | PRI | NULL              | auto_increment    |
| sender_id   | int         | NO   |     | NULL              |                   |
| receiver_id | int         | NO   |     | NULL              |                   |
| chat_uuid   | varchar(36) | NO   |     | NULL              |                   |
| content     | text        | NO   |     | NULL              |                   |
| created_at  | timestamp   | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| is_read     | tinyint(1)  | YES  |     | 0                 |                   |

### chat_channel
| Field      | Type      | Null | Key | Default           | Extra             |
|------------|-----------|------|-----|-------------------|-------------------|
| user_id_1  | int       | NO   | PRI | NULL              |                   |
| user_id_2  | int       | NO   | PRI | NULL              |                   |
| chat_uuid  | char(36)  | NO   |     | NULL              |                   |
| created_at | timestamp | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### post_like
| Field      | Type      | Null | Key | Default           | Extra             |
|------------|-----------|------|-----|-------------------|-------------------|
| post_id    | int       | NO   | PRI | NULL              |                   |
| user_id    | int       | NO   | PRI | NULL              |                   |
| created_at | timestamp | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### post_bookmark
| Field      | Type      | Null | Key | Default           | Extra             |
|------------|-----------|------|-----|-------------------|-------------------|
| post_id    | int       | NO   | PRI | NULL              |                   |
| user_id    | int       | NO   | PRI | NULL              |                   |
| created_at | timestamp | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

## Limitations and Future Improvements
* The `tag` column in the `post` table does not adhere to the First Normal Form (1NF).
* Using the LIKE operator for keyword search in posts results in poor performance due to inefficient wildcard matching.
* Does not support scaling server instances during high user activity periods.

## Future Solution
* Add new tables, `tags` and `post_tag`, for normalization.
* Use ElasticSearch as the search engine to enhance search performance.
* Use MongoDB to store posts due to its flexibility in handling unstructured data and its ability to scale horizontally.
* Add a CDN for faster access from different global locations.

## Contact me
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2.svg?style=for-the-badge&logo=LinkedIn&logoColor=white)](https://www.linkedin.com/in/%E5%A4%A7%E6%81%95-%E9%82%B1-058348283/)
[![Gmail](https://img.shields.io/badge/Gmail-EA4335.svg?style=for-the-badge&logo=Gmail&logoColor=white)](mailto:maxchauo0628@gmail.com)





