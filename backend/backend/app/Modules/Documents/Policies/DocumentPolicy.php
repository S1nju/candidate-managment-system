<?php

namespace App\Modules\Documents\Policies;

use App\Models\User;
use App\Modules\Documents\Models\Document;

class DocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Both Admin and Worker can view list, but filtered.
        // Policy says "can I access the index action?" which is Yes.
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Document $document): bool
    {
        return $user->hasRole('admin') ||
               $document->assigned_to === $user->id ||
               $document->owner_id === $user->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Document $document): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Document $document): bool
    {
        return $user->hasRole('admin');
    }
}
