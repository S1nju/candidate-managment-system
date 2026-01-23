<?php

namespace App\Modules\Users\Services;

use App\Models\User;
use App\Modules\Users\Repositories\UserRepository;
use Illuminate\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(protected UserRepository $userRepository) {}

    public function listUsers(int $perPage = 15): LengthAwarePaginator
    {
        return $this->userRepository->getAll($perPage);
    }

    public function createUser(array $data): User
    {
        return $this->userRepository->create($data);
    }

    public function getUser(int $id): User
    {
        return $this->userRepository->find($id);
    }

    public function updateUser(User $user, array $data): User
    {
        return $this->userRepository->update($user, $data);
    }

    public function deleteUser(User $user): void
    {
        $this->userRepository->delete($user);
    }
}
