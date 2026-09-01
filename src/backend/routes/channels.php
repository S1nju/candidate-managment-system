<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('candidates.{id}.signing', function ($user, $id) {
    // Basic authorization: user must be authenticated
    // In a real app, you'd check if user has access to this specific candidate
    return [
        'id' => $user->id,
        'name' => $user->name,
    ];
});
