/* eslint-disable ft-flow/require-valid-file-annotation */
/* global _, $, alert, document, window */
$.fn.serializeObject = function () {
  const o = {};
  const a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

$.ajaxSetup({ cache: false });
$(document).ajaxStart(() => {
  $('.loading-indicator').css('visibility', 'visible');
});

$(document).ajaxError((event, jqxhr, settings, thrownError) => {
  if (thrownError) {
    alert(`Error: ${thrownError}!`);
  } else {
    alert('Cross domain cookie problem. My apologies.');
    window.top.location.href = window.location.href;
  }
});

$(document).ajaxStop(() => {
  $('.loading-indicator').css('visibility', 'hidden');
});

function populateTable(target, data, template, prefix) {
  target.html((prefix || '') + data.map((x) => {
    if (x.links) {
      x.links = x.links.map(_.template('<a target="_blank" style="margin: 5px;" class="btn btn-info" href="<%- link %>"><%- lang %></a>')).join('');
    }
    return x;
  }).map(_.template(template)).join(''));
}

const initializers = {
  banners() {
    $.getJSON('/api/admin/banners').done((banners) => {
      populateTable($('#banners-table'), banners, '<tr role="row"><td><%- location %></td><td><%- id %></td><td><%- source %></td><td><%- bonus %></td><td><%- promotion %></td><td><%- tags %></td><td><%= links %></td></tr>');
    });
  },
  landers() {
    $.getJSON('/api/admin/landers').done((landers) => {
      populateTable($('#landers-table'), landers, '<tr role="row"><td><%- id %></td><td><%- bonus %></td><td><%- type %></td><td><%- tags %></td><td><%- location %></td><td><%= links %></td></tr>');
    });
  },
};

function resetUi() {
  $('.alert').hide();
  $('#user-view').hide();
  $('#sync-status-holder').hide();
  $('.extras-holder').empty().hide();
  $('#smsverification-result-holder').hide();
  $('#smsverification-holder').hide();
  $('#smsverification-sent').hide();
}

$(() => {
  $('[data-hide]').on('click', function () {
    $(this).closest(`.${$(this).attr('data-hide')}`).hide();
  });

  $('.alert').alert();

  $('a[data-target]').click(function () {
    $('div[data-link]').hide();
    const id = $(this).data('target');
    $(`div[data-link="${id}"]`).show();
    if (initializers[id]) {
      initializers[id]();
    }
    return false;
  });

  $('a[data-target]:first').click();

  resetUi();

  function syncButton(path) {
    $.post(path, {})
      .fail(() => {
        resetUi();
        $('#sync-fail').show().fadeOut(1500);
      }).done((data) => {
        resetUi();
        if (data.ok) {
          $('#sync-ok').show().fadeOut(1500);
        } else {
          $('#sync-fail').show().fadeOut(1500);
        }
        if (data.errors) {
          $('#sync-status').html(data.errors.join('\n'));
          $('#sync-status-holder').show();
        }
      });
    return false;
  }

  $('.sync-button').click(function () {
    return syncButton(`/api/admin/gdocs/${$(this).data('target')}`);
  });
});

$(() => {
  function populateSmsVerification(data) {
    resetUi();
    console.log('populateSmsVerification', data);
    $('#smsverification-send-failed').hide();
    if (data.verify && data.verify.valid) {
      $('#smsverification-result-holder').show();
      $('#smsverification-code').text(data.code);
      $('#smsverification-messages').show();
      $('#smsverification-code').text(data.code);
      $('#smsverification-holder').show();
    } else if (data.verify) {
      $('#invalid-phonenumber').show().text(data.verify.message);
    } else {
      $('#invalid-phonenumber').show().text(data.result || 'Invalid phone number');
    }
    if (data.pinCode) {
      $('#smsverification-sent').show().find('b').text(`Sent pin code: ${data.pinCode}`);
    }
  }

  $('#smsverification-button').click((e) => {
    e.preventDefault();
    $('#smsverification-form').submit();
  });

  $('#smsverification-send-form').on('submit', (e) => {
    e.preventDefault();
    const data = {
      phone: $('#smsverification-form input[name="phone"]').val(),
      lang: $('#smsverification-lang').val(),
    };
    $.post('/api/admin/smsverification', data).fail(() => {
      $('#smsverification-send-failed').show();
    }).done(populateSmsVerification);
  });

  $('#smsverification-form').submit((e) => {
    e.preventDefault();
    $.getJSON('/api/admin/smsverification', { phone: $('#smsverification-form input[name="phone"]').val() })
      .fail(() => {
        resetUi();
        $('#smsverification-failed').show();
      }).done(populateSmsVerification);
    return false;
  });
});
