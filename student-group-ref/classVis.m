function classVis(data)
% Scale Visualization
figure
Tick = {{'积极','沉思'},{'感官','直觉'},{'视觉','言语'},{'顺序','全局'}};
numStudents = size(data,1);
numTicks = 10;
tickInterval = round(numStudents/numTicks);
tiledlayout(2,2)
for ii = 1:4 % For each learning style characteristics
    temp1 = data(:,ii);
    temp2 = data(:,ii);
    temp1(temp1<0) = 0;
    temp2(temp2>0) = 0;
    nexttile
    % subplot(2,2,ii); % Four characteristics for for subplots
    barh(temp1,'stacked','EdgeColor','none');
    hold on
    barh(temp2,'stacked','EdgeColor','none');
    xticks([min(min(data))+1,max(max(data))-1]);
    xticklabels(Tick{ii});
    xlim([min(min(data)),max(max(data))]);
    yticks(1:tickInterval:numStudents);
    set(gca,'TickLength',[0,0]);
end
f = gcf;
f.Position = [2   171   749   626];