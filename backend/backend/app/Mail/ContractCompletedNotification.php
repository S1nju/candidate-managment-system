<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Storage;

class ContractCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public \App\Modules\Candidates\Models\Candidate $candidate,
        public array $signedContractPaths,
        public ?string $completionAttachmentPath = null
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Contract is Fully Signed and Completed',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.candidate.contract-completed',
            with: [
                'candidateName' => $this->candidate->name,
                'hasExtraAttachment' => !empty($this->completionAttachmentPath),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        foreach ($this->signedContractPaths as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                $attachments[] = Attachment::fromStorageDisk('public', $path);
            }
        }

        if ($this->completionAttachmentPath && Storage::disk('public')->exists($this->completionAttachmentPath)) {
            $attachments[] = Attachment::fromStorageDisk('public', $this->completionAttachmentPath)
                ->as('Completion_Attachment.' . pathinfo($this->completionAttachmentPath, PATHINFO_EXTENSION));
        }

        return $attachments;
    }
}
