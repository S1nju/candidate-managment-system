<?php

namespace App\Modules\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DocumentAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public int|string|null $documentId, public string $documentTitle = 'Document') {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Document Assigned: '.$this->documentTitle)
            ->line('You have been assigned a new document to sign.')
            ->line('Document: '.$this->documentTitle)
            ->action('View Document', url('/dashboard/documents/'.$this->documentId))
            ->line('Please sign it at your earliest convenience.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document',
            'title' => 'New Document Assigned',
            'message' => "You have been assigned a new document: {$this->documentTitle}",
            'document_id' => $this->documentId,
        ];
    }
}
