<?php

namespace App\Modules\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DocumentSignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public int|string|null $documentId, public string $documentTitle = 'Document', public string $workerName = 'Worker') {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Document Signed: '.$this->documentTitle)
            ->line('A document you own has been signed.')
            ->line('Document: '.$this->documentTitle)
            ->line('Signed by: '.$this->workerName)
            ->action('View Document', url('/dashboard/documents/'.$this->documentId));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_signed',
            'title' => 'Document Signed',
            'message' => "The document '{$this->documentTitle}' has been signed by {$this->workerName}.",
            'document_id' => $this->documentId,
        ];
    }
}
