# Disabled for test environment, because it simply didn't work
return if Rails.env.test?

class Tracker
  include Singleton
  def add(runtime)
    Thread.current[:couch_runtime] ||= 0
    Thread.current[:couch_runtime] += runtime
  end

  def reset_runtime
    runtime = (Thread.current[:couch_runtime] || 0)
    Thread.current[:couch_runtime] = nil
    runtime
  end
end


require 'active_support/core_ext/module/attr_internal'
module CouchPotato
  class Database
    alias :view_without_benchmark :view
    def view(spec)
      result = nil
      runtime = Benchmark.ms { result = view_without_benchmark(spec) }
      log_entry = '[CouchPotato] view query: %s#%s?%s (%.1fms)' % [spec.send(:klass).name, spec.view_name, spec.view_parameters, runtime]
      Rails.logger.debug(log_entry)
      Tracker.instance.add(runtime)
      result
    end
  end

  module ControllerRuntime
    extend ActiveSupport::Concern

    module ClassMethods
      def log_process_action(payload)
        messages, couch_runtime = super, payload[:couch_runtime]
        messages << ("CouchPotato: %.1fms" % couch_runtime.to_f) if couch_runtime
        messages
      end
    end

    private

    attr_internal :couch_runtime

    def cleanup_view_runtime
      if logger && logger.info?
        db_rt_before_render = Tracker.instance.reset_runtime
        self.couch_runtime = (couch_runtime || 0) + db_rt_before_render
        runtime = super
        db_rt_after_render = Tracker.instance.reset_runtime
        self.couch_runtime += db_rt_after_render
        logger.debug "subtracting #{db_rt_after_render} from runtime #{runtime}"
        runtime - db_rt_after_render
      else
        super
      end
    end
    
    def append_info_to_payload(payload)
      super
      payload[:couch_runtime] = (couch_runtime || 0) + Tracker.instance.reset_runtime
    end
  end
end

module ActionController
  class Base
    include CouchPotato::ControllerRuntime
  end
end
