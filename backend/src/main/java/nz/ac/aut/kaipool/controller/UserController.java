package nz.ac.aut.kaipool.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import nz.ac.aut.kaipool.dto.UpdateUserRequest;
import nz.ac.aut.kaipool.dto.ChangePasswordRequest;
import nz.ac.aut.kaipool.dto.UserResponse;
import nz.ac.aut.kaipool.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return userService.getCurrentUser(principal.getName());
    }

    @PutMapping("/me")
    public UserResponse updateMe(Principal principal, @Valid @RequestBody UpdateUserRequest request) {
        return userService.updateCurrentUser(principal.getName(), request);
    }

    @PutMapping("/me/password")
    public void changePassword(Principal principal, @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getName(), request);
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.getUser(id);
    }
}
