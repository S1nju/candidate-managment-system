<?php

namespace App\Modules\Notifications\Notifications;

use App\Modules\Documents\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DocumentAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Document $document) {}

    public function via(object $notifiable): array
    {
        return ['mail']; // Add 'database' if we want in-app notifications later
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Document Assigned: '.$this->document->title)
            ->line('You have been assigned a new document to sign.')
            ->line('Document: '.$this->document->title)
            ->action('View Document', url('/documents/'.$this->document->id))
            ->line('Please sign it at your earliest convenience.');
    }
}
