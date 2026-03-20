<!DOCTYPE html>
<html>
<head>
    <title>Your Contract is Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Hello {{ $candidateName }},</h2>

    <p>Good news! Your contract is now fully signed and executed by all parties.</p>

    <p>Please find attached your final signed contract document(s) for your records.</p>

    @if($hasExtraAttachment)
    <p>We have also attached a helpful document regarding your onboarding or next steps. Please review it carefully.</p>
    @endif

    <p>If you have any questions, please perform not hesitate to contact us.</p>

    <br />
    <p>Thank you,<br/><strong>{{ config('app.name') }}</strong></p>
</body>
</html>
