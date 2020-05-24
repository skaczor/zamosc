class ApplicationController < ActionController::Base
  before_action :set_title

  private

  def set_title
    @title = "#{action_name.titleize} #{self.class.name.gsub(/Controller$/, '').singularize.titleize}"
  end
end
