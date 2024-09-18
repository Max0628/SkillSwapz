package com.maxchauo.skillswapz.rowmapper;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.data.dto.post.TagDto;
import org.springframework.jdbc.core.ResultSetExtractor;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CategoryResultSetExtractor implements ResultSetExtractor<List<CategoryDto>> {

    @Override
    public List<CategoryDto> extractData(ResultSet rs) throws SQLException {
        Map<Integer, CategoryDto> categoryMap = new LinkedHashMap<>();

        while (rs.next()) {
            Integer categoryId = rs.getInt("category_id");
            String categoryName = rs.getString("category_name");

            CategoryDto categoryDto = categoryMap.get(categoryId);
            if (categoryDto == null) {
                categoryDto = new CategoryDto(categoryId, categoryName, new ArrayList<>());
                categoryMap.put(categoryId, categoryDto);
            }

            Integer tagId = rs.getInt("tag_id");
            String tagName = rs.getString("tag_name");
            if (tagId != 0 && tagName != null) {
                TagDto tagDto = new TagDto(tagId, tagName);
                categoryDto.getTags().add(tagDto);
            }
        }

        return new ArrayList<>(categoryMap.values());
    }
}
