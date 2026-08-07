package nz.ac.aut.kaipool.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import nz.ac.aut.kaipool.dto.FoodRecognitionResponse;
import nz.ac.aut.kaipool.service.FoodRecognitionService;

@RestController
@RequestMapping("/api/scan")
public class FoodRecognitionController {

    private final FoodRecognitionService foodRecognitionService;

    public FoodRecognitionController(FoodRecognitionService foodRecognitionService) {
        this.foodRecognitionService = foodRecognitionService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    FoodRecognitionResponse recognize(@RequestPart("image") MultipartFile image) {
        return foodRecognitionService.recognize(image);
    }
}
