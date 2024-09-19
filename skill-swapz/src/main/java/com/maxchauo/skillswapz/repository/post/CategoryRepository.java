package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.rowmapper.CategoryResultSetExtractor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CategoryRepository {

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public CategoryRepository(NamedParameterJdbcTemplate namedParameterJdbcTemplate) {
        this.namedParameterJdbcTemplate = namedParameterJdbcTemplate;
    }

    public List<CategoryDto> findAllCategoriesWithTags() {
        String sql = "SELECT c.id AS category_id, c.category_name, t.id AS tag_id, t.tag_name " +
                "FROM category c LEFT JOIN tag t ON c.id = t.category_id";
        return namedParameterJdbcTemplate.query(sql, new MapSqlParameterSource(), new CategoryResultSetExtractor());
    }
}
