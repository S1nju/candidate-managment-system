<?php

namespace App\Mail;

use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\EmailContract;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailContractInvite extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Candidate $candidate,
        public string $signUrl,
        public EmailContract $contract,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: $this->contract->mail_config['from'] ?? config('mail.from.address'),
            subject: $this->contract->mail_config['subject'] ?? 'Please sign the contract',
        );
    }

    public function content(): Content
    {
        $body = $this->contract->mail_config['body'] ?? '';
        $body = str_replace(
            ['[candidate_name]', '[candidate_email]', '[sign_link]'],
            [$this->candidate->name, $this->candidate->email, $this->signUrl],
            $body
        );

        return new Content(
            html: 'emails.email-contract-invite',
            with: [
                'candidate' => $this->candidate,
                'body' => $body,
                'signUrl' => $this->signUrl,
                'contract' => $this->contract,
            ],
        );
    }
}
