<!DOCTYPE html>
<html>

<head>
    <title>Sign Your Contract</title>
</head>

<body>
    <h1>Hello, {{ $candidateName }}!</h1>
    <p>Please review and sign your contract by clicking the link below:</p>
    <p>
        <a href="{{ $url }}">Sign Contract</a>
    </p>
    <p>If you have any questions, please contact us.</p>
    <br>
    <p>Best regards,<br>{{ config('app.name') }}</p>
</body>

</html>