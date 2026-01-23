<?php

namespace App\Modules\Notifications\Notifications;

use App\Modules\Documents\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DocumentSignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Document $document) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Document Signed: '.$this->document->title)
            ->line('A document you own has been signed.')
            ->line('Document: '.$this->document->title)
            ->line('Signed by: '.$this->document->worker->name)
            ->action('View Document', url('/documents/'.$this->document->id));
    }
}
