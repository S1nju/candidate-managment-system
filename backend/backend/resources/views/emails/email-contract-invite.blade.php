@component('mail::layout')
{{-- Header --}}
@slot('header')
@component('mail::header', ['url' => config('app.url')])
SignMeHere
@endcomponent
@endslot

{{-- Body --}}
{!! $body !!}

<x-mail::button :url="$signUrl" color="primary">
Sign Contract
</x-mail::button>

{{-- Footer --}}
@slot('footer')
@component('mail::footer')
© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
@endcomponent
@endslot
@endcomponent
